"""Nghiệp vụ yêu cầu cập nhật hồ sơ — API.md mục 4.4, 5.2, 6.3, 6.6."""
from datetime import datetime
from typing import Literal
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload
from app.core.errors import ApiError
from app.models import ProfileUpdateRequest, Student, StudentSkill, User
from app.schemas.student import avatar_url, iso
from app.services import audit_service, student_service
from app.services.common import paginate

ALLOWED_FIELDS = {"phone", "address", "hobbies", "skills", "social_links"}
RequestStatus = Literal["pending", "approved", "rejected", "all"]

def request_out(req: ProfileUpdateRequest) -> dict:
    return {"id": req.id, "status": req.status, "new_data": req.new_data,
            "reject_reason": req.reject_reason, "created_at": iso(req.created_at), "reviewed_at": iso(req.reviewed_at)}

def _request_list_item(row) -> dict:
    req, student_code, full_name = row
    return {"id": req.id, "status": req.status, "student_id": req.student_id, "student_code": student_code,
            "full_name": full_name, "created_at": iso(req.created_at), "reviewed_at": iso(req.reviewed_at)}

def _validate_request_payload(data: object) -> dict:
    if not isinstance(data, dict) or not data:
        raise ApiError(400, "Vui lòng gửi ít nhất một thông tin cần cập nhật")
    for key in data:
        if key not in ALLOWED_FIELDS:
            raise ApiError(400, "Trường này chỉ admin được sửa", field=str(key))
    cleaned: dict = {}
    for key, val in data.items():
        if key == "phone": cleaned["phone"] = student_service.validate_phone(val)
        elif key == "address": cleaned["address"] = student_service.validate_address(val)
        elif key == "hobbies": cleaned["hobbies"] = student_service.validate_hobbies(val)
        elif key == "skills": cleaned["skills"] = student_service.validate_skills_list(val)
        elif key == "social_links": cleaned["social_links"] = student_service.validate_social_links_list(val)
    return cleaned

def _extract_current_fields(student: Student, keys) -> dict:
    current: dict = {}
    for k in keys:
        if k in ("phone", "address", "hobbies"): current[k] = getattr(student, k)
        elif k == "skills":
            skills = sorted(student.skills, key=lambda s: (-s.level, s.skill.name))
            current["skills"] = [{"name": s.skill.name, "level": s.level} for s in skills]
        elif k == "social_links":
            links = sorted(student.social_links, key=lambda l: l.platform)
            current["social_links"] = [{"platform": l.platform, "url": l.url} for l in links]
    return current

def _load_request_with_student(db: Session, request_id: int) -> ProfileUpdateRequest | None:
    return (db.query(ProfileUpdateRequest).filter(ProfileUpdateRequest.id == request_id)
            .options(joinedload(ProfileUpdateRequest.reviewer),
                     joinedload(ProfileUpdateRequest.student).options(
                         selectinload(Student.skills).joinedload(StudentSkill.skill),
                         selectinload(Student.social_links))).first())

def list_my_requests(db: Session, student: Student) -> list[dict]:
    reqs = (db.query(ProfileUpdateRequest).filter(ProfileUpdateRequest.student_id == student.id)
            .order_by(ProfileUpdateRequest.created_at.desc(), ProfileUpdateRequest.id.desc()).all())
    return [request_out(r) for r in reqs]

def submit_request(db: Session, student: Student, data: object) -> dict:
    cleaned = _validate_request_payload(data)
    if db.query(ProfileUpdateRequest.id).filter(ProfileUpdateRequest.student_id == student.id, ProfileUpdateRequest.status == "pending").first():
        raise ApiError(400, "Bạn đang có yêu cầu chờ duyệt")
    req = ProfileUpdateRequest(student_id=student.id, new_data=cleaned, status="pending")
    db.add(req)
    try: db.commit()
    except IntegrityError:
        db.rollback(); raise ApiError(400, "Bạn đang có yêu cầu chờ duyệt")
    db.refresh(req)
    return request_out(req)

def list_requests(db: Session, status: RequestStatus = "pending", page: int = 1, page_size: int = 10) -> dict:
    query = db.query(ProfileUpdateRequest, Student.student_code, Student.full_name).join(Student, ProfileUpdateRequest.student_id == Student.id)
    if status != "all": query = query.filter(ProfileUpdateRequest.status == status)
    return paginate(query.order_by(ProfileUpdateRequest.created_at.desc(), ProfileUpdateRequest.id.desc()),
                    page=page, page_size=page_size, mapper=_request_list_item)

def get_request_detail(db: Session, request_id: int) -> dict:
    req = _load_request_with_student(db, request_id)
    if not req: raise ApiError(404, "Không tìm thấy yêu cầu cập nhật")
    student = req.student
    keys = list(req.new_data.keys()) if isinstance(req.new_data, dict) else []
    return {"id": req.id, "status": req.status,
            "student": {"id": student.id, "student_code": student.student_code, "full_name": student.full_name, "avatar_url": avatar_url(student)},
            "new_data": req.new_data, "current": _extract_current_fields(student, keys),
            "reject_reason": req.reject_reason, "reviewed_by": req.reviewer.username if req.reviewer else None,
            "created_at": iso(req.created_at), "reviewed_at": iso(req.reviewed_at)}

def approve_request(db: Session, admin: User, request_id: int) -> dict:
    req = _load_request_with_student(db, request_id)
    if not req: raise ApiError(404, "Không tìm thấy yêu cầu cập nhật")
    if req.status != "pending": raise ApiError(400, "Yêu cầu này đã được xử lý")
    cleaned = _validate_request_payload(req.new_data)
    student = req.student
    old_data = _extract_current_fields(student, cleaned.keys())
    if "phone" in cleaned: student.phone = cleaned["phone"]
    if "address" in cleaned: student.address = cleaned["address"] or None
    if "hobbies" in cleaned: student.hobbies = cleaned["hobbies"] or None
    if "skills" in cleaned: student_service.sync_student_skills(db, student, cleaned["skills"])
    if "social_links" in cleaned: student_service.sync_student_social_links(db, student, cleaned["social_links"])
    req.status, req.reviewed_by, req.reviewed_at = "approved", admin.id, datetime.now().replace(microsecond=0)
    audit_service.write_log(db, user_id=admin.id, action="approve", target_type="student", target_id=student.id,
                            old_data=old_data, new_data=_extract_current_fields(student, cleaned.keys()))
    db.commit()
    return {"ok": True}

def reject_request(db: Session, admin: User, request_id: int, reject_reason: str | None) -> dict:
    req = db.query(ProfileUpdateRequest).filter(ProfileUpdateRequest.id == request_id).first()
    if not req: raise ApiError(404, "Không tìm thấy yêu cầu cập nhật")
    if req.status != "pending": raise ApiError(400, "Yêu cầu này đã được xử lý")
    reason = (reject_reason or "").strip()
    if not reason: raise ApiError(400, "Vui lòng nhập lý do từ chối", field="reject_reason")
    if len(reason) > 255: raise ApiError(400, "Lý do từ chối không được vượt quá 255 ký tự", field="reject_reason")
    req.status, req.reject_reason, req.reviewed_by, req.reviewed_at = "rejected", reason, admin.id, datetime.now().replace(microsecond=0)
    audit_service.write_log(db, user_id=admin.id, action="reject", target_type="student", target_id=req.student_id, new_data={"reject_reason": reason})
    db.commit()
    return {"ok": True}
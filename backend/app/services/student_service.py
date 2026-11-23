"""Nghiệp vụ sinh viên — API.md mục 5.1, 6.2, 6.4."""
import io
import json
import re
import zipfile
from datetime import date, datetime
from xml.sax.saxutils import escape as xml_escape

from fastapi import UploadFile
from sqlalchemy.orm import Session, contains_eager, joinedload, selectinload

from app.core.config import settings
from app.core.errors import ApiError
from app.core.security import hash_password
from app.models import ClassRoom, Major, Skill, SocialLink, Student, StudentSkill, User
from app.schemas.student import student_detail, student_list_item
from app.services import audit_service, upload_service
from app.services.common import like_pattern, paginate

STUDENT_CODE_RE = re.compile(r"^[A-Z]\d{2}[A-Z]{4}\d{3}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^0\d{9}$")
VALID_GENDERS = ("Nam", "Nữ", "Khác")

SORT_ORDERS = {
    "newest": (Student.created_at.desc(), Student.id.desc()),
    "name": (Student.full_name.asc(), Student.id.asc()),
    "class": (ClassRoom.code.asc(), Student.full_name.asc(), Student.id.asc()),
}

EXPORT_HEADERS = ["Mã SV", "Họ tên", "Giới tính", "Ngày sinh", "Email",
                  "Số điện thoại", "Lớp", "Ngành", "Địa chỉ"]


def validate_phone(value, empty_message: str = "Số điện thoại phải gồm 10 chữ số") -> str:
    phone = value.strip() if isinstance(value, str) else None
    if phone == "":
        raise ApiError(400, empty_message, field="phone")
    if phone is None or not PHONE_RE.fullmatch(phone):
        raise ApiError(400, "Số điện thoại phải gồm 10 chữ số", field="phone")
    return phone


def validate_address(value) -> str:
    if value is not None and not isinstance(value, str):
        raise ApiError(400, "Địa chỉ không hợp lệ", field="address")
    address = (value or "").strip()
    if len(address) > 255:
        raise ApiError(400, "Địa chỉ không được vượt quá 255 ký tự", field="address")
    return address


def validate_hobbies(value) -> str:
    if value is not None and not isinstance(value, str):
        raise ApiError(400, "Sở thích không hợp lệ", field="hobbies")
    return (value or "").strip()


def _parse_skill_level(raw, field: str) -> int:
    if raw is None:
        return 3
    if isinstance(raw, int) and not isinstance(raw, bool):
        level = raw
    elif isinstance(raw, str) and raw.strip().isdigit():
        level = int(raw)
    else:
        raise ApiError(400, "Mức kỹ năng phải từ 1 đến 5", field=field)
    if not 1 <= level <= 5:
        raise ApiError(400, "Mức kỹ năng phải từ 1 đến 5", field=field)
    return level


def validate_skills_list(raw_list) -> list[dict]:
    if not isinstance(raw_list, list):
        raise ApiError(400, "Danh sách kỹ năng không hợp lệ", field="skills")
    cleaned, seen = [], set()
    for i, item in enumerate(raw_list):
        if not isinstance(item, dict):
            raise ApiError(400, "Dữ liệu kỹ năng không hợp lệ", field=f"skills[{i}]")
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ApiError(400, "Tên kỹ năng không được để trống", field=f"skills[{i}].name")
        name = name.strip()
        if len(name) > 50:
            raise ApiError(400, "Tên kỹ năng không được vượt quá 50 ký tự", field=f"skills[{i}].name")
        if name.lower() in seen:
            raise ApiError(400, "Kỹ năng không được trùng tên", field=f"skills[{i}].name")
        seen.add(name.lower())
        level = _parse_skill_level(item.get("level", 3), field=f"skills[{i}].level")
        cleaned.append({"name": name, "level": level})
    return cleaned


def validate_social_links_list(raw_list) -> list[dict]:
    if not isinstance(raw_list, list):
        raise ApiError(400, "Danh sách mạng xã hội không hợp lệ", field="social_links")
    cleaned, seen = [], set()
    for i, item in enumerate(raw_list):
        if not isinstance(item, dict):
            raise ApiError(400, "Dữ liệu mạng xã hội không hợp lệ", field=f"social_links[{i}]")
        platform = item.get("platform")
        if not isinstance(platform, str) or not platform.strip():
            raise ApiError(400, "Tên nền tảng không được để trống", field=f"social_links[{i}].platform")
        platform = platform.strip()
        if len(platform) > 30:
            raise ApiError(400, "Tên nền tảng không được vượt quá 30 ký tự", field=f"social_links[{i}].platform")
        if platform.lower() in seen:
            raise ApiError(400, "Mỗi nền tảng chỉ được một liên kết", field=f"social_links[{i}].platform")
        seen.add(platform.lower())

        url = item.get("url")
        if not isinstance(url, str) or not url.strip():
            raise ApiError(400, "URL không được để trống", field=f"social_links[{i}].url")
        url = url.strip()
        if len(url) > 255:
            raise ApiError(400, "URL không được vượt quá 255 ký tự", field=f"social_links[{i}].url")
        if url in ("http://", "https://") or not url.startswith(("http://", "https://")):
            raise ApiError(400, "URL phải bắt đầu bằng http:// hoặc https://", field=f"social_links[{i}].url")
        cleaned.append({"platform": platform, "url": url})
    return cleaned


def _required(data: dict, field: str) -> str:
    value = (data.get(field) or "").strip()
    if not value:
        raise ApiError(400, "Trường này là bắt buộc", field=field)
    return value


def _parse_birth_date(raw: str) -> date:
    try:
        if len(raw) != 10:
            raise ValueError
        birth_date = date.fromisoformat(raw)
    except ValueError:
        raise ApiError(400, "Ngày sinh không hợp lệ (YYYY-MM-DD)", field="birth_date")
    if birth_date > date.today():
        raise ApiError(400, "Ngày sinh không được ở tương lai", field="birth_date")
    return birth_date


def _parse_classroom(db: Session, raw: str) -> ClassRoom:
    if not raw.isdigit():
        raise ApiError(400, "Lớp học không hợp lệ", field="class_id")
    classroom = db.query(ClassRoom).filter(ClassRoom.id == int(raw)).first()
    if not classroom:
        raise ApiError(400, "Lớp học không tồn tại", field="class_id")
    return classroom


def _parse_json_list(raw: str | None, field: str, validator) -> list[dict]:
    if raw is None or not raw.strip():
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise ApiError(400, "Dữ liệu không hợp lệ", field=field)
    return validator(parsed)


def _validate_student_form(db: Session, data: dict, is_update: bool = False) -> dict:
    code = _required(data, "student_code").upper()
    if not STUDENT_CODE_RE.fullmatch(code):
        raise ApiError(400, "Mã sinh viên không đúng định dạng (ví dụ: B24DTCN001)", field="student_code")

    full_name = _required(data, "full_name")
    if len(full_name) > 100:
        raise ApiError(400, "Họ tên không được vượt quá 100 ký tự", field="full_name")

    gender = _required(data, "gender")
    if gender not in VALID_GENDERS:
        raise ApiError(400, "Giới tính phải là Nam, Nữ hoặc Khác", field="gender")

    birth_date = _parse_birth_date(_required(data, "birth_date"))

    email = _required(data, "email")
    if len(email) > 100 or not EMAIL_RE.fullmatch(email):
        raise ApiError(400, "Email không đúng định dạng", field="email")

    phone = validate_phone(data.get("phone") or "", empty_message="Trường này là bắt buộc")
    address = validate_address(data.get("address")) or None
    hobbies = validate_hobbies(data.get("hobbies")) or None
    classroom = _parse_classroom(db, _required(data, "class_id"))

    skills = None
    if not (is_update and data.get("skills") is None):
        skills = _parse_json_list(data.get("skills"), "skills", validate_skills_list)
    social_links = None
    if not (is_update and data.get("social_links") is None):
        social_links = _parse_json_list(data.get("social_links"), "social_links", validate_social_links_list)

    return {
        "student_code": code, "full_name": full_name, "gender": gender, "birth_date": birth_date,
        "email": email, "phone": phone, "address": address, "hobbies": hobbies,
        "classroom": classroom, "skills": skills, "social_links": social_links,
    }


def _check_duplicates(db: Session, code: str, email: str, student: Student | None = None):
    code_query = db.query(Student.id).filter(Student.student_code == code)
    username_query = db.query(User.id).filter(User.username == code)
    email_query = db.query(Student.id).filter(Student.email == email)
    if student is not None:
        code_query = code_query.filter(Student.id != student.id)
        username_query = username_query.filter(User.id != (student.user_id or -1))
        email_query = email_query.filter(Student.id != student.id)

    if code_query.first() or username_query.first():
        raise ApiError(400, "Mã sinh viên đã tồn tại", field="student_code")
    if email_query.first():
        raise ApiError(400, "Email đã được sử dụng", field="email")


def _load_full_student(db: Session, student_id: int) -> Student | None:
    return (
        db.query(Student)
        .filter(Student.id == student_id)
        .options(
            joinedload(Student.user),
            joinedload(Student.classroom).joinedload(ClassRoom.major),
            selectinload(Student.skills).joinedload(StudentSkill.skill),
            selectinload(Student.social_links),
        )
        .first()
    )


def _has_file(file: UploadFile | None) -> bool:
    return file is not None and bool(file.filename)


def _apply_fields(student: Student, cleaned: dict):
    student.student_code = cleaned["student_code"]
    student.full_name = cleaned["full_name"]
    student.gender = cleaned["gender"]
    student.birth_date = cleaned["birth_date"]
    student.email = cleaned["email"]
    student.phone = cleaned["phone"]
    student.address = cleaned["address"]
    student.hobbies = cleaned["hobbies"]
    student.class_id = cleaned["classroom"].id
    student.classroom = cleaned["classroom"]
    # Gán thủ công thay cho ON UPDATE CURRENT_TIMESTAMP (không có trên SQLite)
    student.updated_at = datetime.now().replace(microsecond=0)


def sync_student_skills(db: Session, student: Student, skills_data: list[dict]):
    student.skills.clear()
    db.flush()
    for item in skills_data:
        skill = db.query(Skill).filter(Skill.name == item["name"]).first()
        if not skill:
            skill = Skill(name=item["name"])
            db.add(skill)
            db.flush()
        student.skills.append(StudentSkill(student_id=student.id, skill_id=skill.id,
                                           level=item["level"], skill=skill))
    db.flush()


def sync_student_social_links(db: Session, student: Student, links_data: list[dict]):
    student.social_links.clear()
    db.flush()
    for item in links_data:
        student.social_links.append(SocialLink(student_id=student.id, platform=item["platform"], url=item["url"]))
    db.flush()


def student_snapshot(student: Student) -> dict:
    skills = sorted(student.skills, key=lambda s: (-s.level, s.skill.name))
    links = sorted(student.social_links, key=lambda l: l.platform)
    return {
        "student_code": student.student_code,
        "full_name": student.full_name,
        "gender": student.gender,
        "birth_date": student.birth_date.isoformat() if student.birth_date else None,
        "email": student.email,
        "phone": student.phone,
        "address": student.address,
        "hobbies": student.hobbies,
        "class_id": student.class_id,
        "class": student.classroom.code if student.classroom else None,
        "avatar_filename": student.avatar_filename,
        "skills": [{"name": s.skill.name, "level": s.level} for s in skills],
        "social_links": [{"platform": l.platform, "url": l.url} for l in links],
    }


def _filtered_students(db: Session, q: str, class_id: int | None, major_id: int | None, sort: str):
    query = (
        db.query(Student)
        .join(ClassRoom, Student.class_id == ClassRoom.id)
        .join(Major, ClassRoom.major_id == Major.id)
        .options(contains_eager(Student.classroom).contains_eager(ClassRoom.major))
    )
    keyword = q.strip()
    if keyword:
        pattern = like_pattern(keyword)
        query = query.filter(
            Student.full_name.like(pattern, escape="\\") | Student.student_code.like(pattern, escape="\\")
        )
    if class_id is not None:
        query = query.filter(Student.class_id == class_id)
    if major_id is not None:
        query = query.filter(ClassRoom.major_id == major_id)
    return query.order_by(*SORT_ORDERS[sort])


def list_students(db: Session, viewer: User | None, q: str = "", class_id: int | None = None,
                  major_id: int | None = None, sort: str = "newest", page: int = 1, page_size: int = 12):
    query = _filtered_students(db, q, class_id, major_id, sort)
    return paginate(query, page=page, page_size=page_size, mapper=lambda s: student_list_item(s, viewer))


def get_student(db: Session, student_id: int, viewer: User | None) -> dict:
    student = _load_full_student(db, student_id)
    if not student:
        raise ApiError(404, "Không tìm thấy sinh viên")
    return student_detail(student, viewer)


def list_skills(db: Session, q: str = "") -> list[dict]:
    query = db.query(Skill)
    if q.strip():
        query = query.filter(Skill.name.like(like_pattern(q.strip()), escape="\\"))
    skills = query.order_by(Skill.name.asc()).limit(20).all()
    return [{"id": s.id, "name": s.name} for s in skills]


async def create_student(db: Session, admin: User, data: dict, avatar: UploadFile | None = None) -> dict:
    cleaned = _validate_student_form(db, data)
    _check_duplicates(db, cleaned["student_code"], cleaned["email"])

    avatar_filename = await upload_service.save_avatar(avatar) if _has_file(avatar) else None
    try:
        user = User(
            username=cleaned["student_code"],
            password_hash=hash_password(settings.DEFAULT_STUDENT_PASSWORD),
            role="student",
            is_active=True,
            must_change_password=True,
        )
        db.add(user)
        db.flush()

        student = Student(user_id=user.id, avatar_filename=avatar_filename)
        _apply_fields(student, cleaned)
        db.add(student)
        db.flush()

        sync_student_skills(db, student, cleaned["skills"] or [])
        sync_student_social_links(db, student, cleaned["social_links"] or [])

        audit_service.write_log(db, user_id=admin.id, action="create", target_type="student",
                                target_id=student.id, new_data=student_snapshot(student))
        db.commit()
    except Exception:
        upload_service.delete_avatar(avatar_filename)
        raise

    return student_detail(_load_full_student(db, student.id), admin)


async def update_student(db: Session, admin: User, student_id: int, data: dict,
                         avatar: UploadFile | None = None, remove_avatar: bool = False) -> dict:
    student = _load_full_student(db, student_id)
    if not student:
        raise ApiError(404, "Không tìm thấy sinh viên")

    old_snapshot = student_snapshot(student)
    cleaned = _validate_student_form(db, data, is_update=True)
    _check_duplicates(db, cleaned["student_code"], cleaned["email"], student=student)

    new_avatar = None
    old_avatar = None
    if _has_file(avatar):
        new_avatar = await upload_service.save_avatar(avatar)
        old_avatar = student.avatar_filename
        student.avatar_filename = new_avatar
    elif remove_avatar:
        old_avatar = student.avatar_filename
        student.avatar_filename = None

    try:
        if student.user and student.student_code != cleaned["student_code"]:
            student.user.username = cleaned["student_code"]

        _apply_fields(student, cleaned)
        if cleaned["skills"] is not None:
            sync_student_skills(db, student, cleaned["skills"])
        if cleaned["social_links"] is not None:
            sync_student_social_links(db, student, cleaned["social_links"])
        db.flush()

        audit_service.write_log(db, user_id=admin.id, action="update", target_type="student",
                                target_id=student.id, old_data=old_snapshot, new_data=student_snapshot(student))
        db.commit()
    except Exception:
        upload_service.delete_avatar(new_avatar)
        raise

    if old_avatar and old_avatar != student.avatar_filename:
        upload_service.delete_avatar(old_avatar)

    db.expire_all()
    return student_detail(_load_full_student(db, student.id), admin)


def delete_student(db: Session, admin: User, student_id: int) -> dict:
    student = _load_full_student(db, student_id)
    if not student:
        raise ApiError(404, "Không tìm thấy sinh viên")

    old_avatar = student.avatar_filename
    audit_service.write_log(db, user_id=admin.id, action="delete", target_type="student",
                            target_id=student.id, old_data=student_snapshot(student))

    if student.user:
        student.user.is_active = False
        student.user.username = f"{student.student_code}_deleted_{student.user.id}"

    db.delete(student)
    db.commit()
    upload_service.delete_avatar(old_avatar)
    return {"ok": True}


def _build_xlsx(rows: list[list[str]]) -> bytes:
    sheet_rows = []
    for r, row in enumerate(rows, start=1):
        cells = "".join(
            f'<c r="{chr(65 + c)}{r}" t="inlineStr"><is><t>{xml_escape(str(val or ""))}</t></is></c>'
            for c, val in enumerate(row)
        )
        sheet_rows.append(f'<row r="{r}">{cells}</row>')

    xml_head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    ns_main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    ns_rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    ns_pkg = "http://schemas.openxmlformats.org/package/2006/relationships"
    ct_base = "application/vnd.openxmlformats-officedocument.spreadsheetml"

    files = {
        "[Content_Types].xml": (
            f'{xml_head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            f'<Override PartName="/xl/workbook.xml" ContentType="{ct_base}.sheet.main+xml"/>'
            f'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="{ct_base}.worksheet+xml"/>'
            "</Types>"
        ),
        "_rels/.rels": (
            f'{xml_head}<Relationships xmlns="{ns_pkg}">'
            f'<Relationship Id="rId1" Type="{ns_rel}/officeDocument" Target="xl/workbook.xml"/>'
            "</Relationships>"
        ),
        "xl/workbook.xml": (
            f'{xml_head}<workbook xmlns="{ns_main}" xmlns:r="{ns_rel}">'
            '<sheets><sheet name="SinhVien" sheetId="1" r:id="rId1"/></sheets></workbook>'
        ),
        "xl/_rels/workbook.xml.rels": (
            f'{xml_head}<Relationships xmlns="{ns_pkg}">'
            f'<Relationship Id="rId1" Type="{ns_rel}/worksheet" Target="worksheets/sheet1.xml"/>'
            "</Relationships>"
        ),
        "xl/worksheets/sheet1.xml": (
            f'{xml_head}<worksheet xmlns="{ns_main}"><sheetData>{"".join(sheet_rows)}</sheetData></worksheet>'
        ),
    }

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return buffer.getvalue()


def export_students(db: Session, q: str = "", class_id: int | None = None,
                    major_id: int | None = None, sort: str = "newest") -> bytes:
    students = _filtered_students(db, q, class_id, major_id, sort).all()
    rows = [EXPORT_HEADERS]
    for s in students:
        rows.append([
            s.student_code, s.full_name, s.gender,
            s.birth_date.isoformat() if s.birth_date else "",
            s.email, s.phone, s.classroom.code, s.classroom.major.name, s.address or "",
        ])
    return _build_xlsx(rows)
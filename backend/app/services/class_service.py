"""Nghiệp vụ lớp và ngành — API.md mục 4.3, 5.3, 6.2, 6.5."""
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.errors import ApiError
from app.models import ClassRoom, Major, Student, User
from app.schemas.classes import ClassIn, MajorIn, class_out, major_out
from app.services import audit_service

def _clean_text(value: str, field: str, label: str, max_len: int, upper: bool = False) -> str:
    text = (value or "").strip()
    if upper: text = text.upper()
    if not text: raise ApiError(400, "Trường này là bắt buộc", field=field)
    if len(text) > max_len: raise ApiError(400, f"{label} không được vượt quá {max_len} ký tự", field=field)
    return text

def _get_major_or_404(db: Session, major_id: int) -> Major:
    m = db.query(Major).filter(Major.id == major_id).first()
    if not m: raise ApiError(404, "Không tìm thấy ngành học")
    return m

def _get_class_or_404(db: Session, class_id: int) -> ClassRoom:
    c = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not c: raise ApiError(404, "Không tìm thấy lớp học")
    return c

def _count_classes(db: Session, major_id: int) -> int:
    return db.query(func.count(ClassRoom.id)).filter(ClassRoom.major_id == major_id).scalar() or 0

def _count_students(db: Session, class_id: int) -> int:
    return db.query(func.count(Student.id)).filter(Student.class_id == class_id).scalar() or 0

def list_majors(db: Session) -> list[dict]:
    rows = (db.query(Major, func.count(ClassRoom.id)).outerjoin(ClassRoom, ClassRoom.major_id == Major.id)
            .group_by(Major.id, Major.code, Major.name).order_by(Major.code).all())
    return [major_out(m, n) for m, n in rows]

def create_major(db: Session, admin: User, payload: MajorIn) -> dict:
    code = _clean_text(payload.code, "code", "Mã ngành", 10, upper=True)
    name = _clean_text(payload.name, "name", "Tên ngành", 100)
    if db.query(Major).filter(Major.code == code).first(): raise ApiError(400, "Mã ngành đã tồn tại", field="code")
    if db.query(Major).filter(Major.name == name).first(): raise ApiError(400, "Tên ngành đã tồn tại", field="name")
    major = Major(code=code, name=name)
    db.add(major); db.flush()
    audit_service.write_log(db, user_id=admin.id, action="create", target_type="major", target_id=major.id, new_data={"code": major.code, "name": major.name})
    db.commit()
    return major_out(major, 0)

def update_major(db: Session, admin: User, major_id: int, payload: MajorIn) -> dict:
    major = _get_major_or_404(db, major_id)
    code = _clean_text(payload.code, "code", "Mã ngành", 10, upper=True)
    name = _clean_text(payload.name, "name", "Tên ngành", 100)
    if db.query(Major).filter(Major.code == code, Major.id != major_id).first(): raise ApiError(400, "Mã ngành đã tồn tại", field="code")
    if db.query(Major).filter(Major.name == name, Major.id != major_id).first(): raise ApiError(400, "Tên ngành đã tồn tại", field="name")
    old = {"code": major.code, "name": major.name}
    major.code, major.name = code, name
    audit_service.write_log(db, user_id=admin.id, action="update", target_type="major", target_id=major.id, old_data=old, new_data={"code": code, "name": name})
    db.commit()
    return major_out(major, _count_classes(db, major.id))

def delete_major(db: Session, admin: User, major_id: int) -> dict:
    major = _get_major_or_404(db, major_id)
    if _count_classes(db, major.id) > 0: raise ApiError(400, "Không thể xóa ngành đang có lớp")
    audit_service.write_log(db, user_id=admin.id, action="delete", target_type="major", target_id=major.id, old_data={"code": major.code, "name": major.name})
    db.delete(major); db.commit()
    return {"ok": True}

def list_classes(db: Session, major_id: int | None = None) -> list[dict]:
    query = (db.query(ClassRoom, Major.name, func.count(Student.id)).join(Major, ClassRoom.major_id == Major.id)
             .outerjoin(Student, Student.class_id == ClassRoom.id)
             .group_by(ClassRoom.id, ClassRoom.code, ClassRoom.name, ClassRoom.major_id, Major.name).order_by(ClassRoom.code))
    if major_id is not None: query = query.filter(ClassRoom.major_id == major_id)
    return [class_out(c, m, n) for c, m, n in query.all()]

def _validate_class(db: Session, payload: ClassIn, class_id: int | None = None) -> tuple[str, str, Major]:
    code = _clean_text(payload.code, "code", "Mã lớp", 20, upper=True)
    name = _clean_text(payload.name, "name", "Tên lớp", 100)
    dup = db.query(ClassRoom).filter(ClassRoom.code == code)
    if class_id is not None: dup = dup.filter(ClassRoom.id != class_id)
    if dup.first(): raise ApiError(400, "Mã lớp đã tồn tại", field="code")
    major = db.query(Major).filter(Major.id == payload.major_id).first()
    if not major: raise ApiError(400, "Ngành học không tồn tại", field="major_id")
    return code, name, major

def create_class(db: Session, admin: User, payload: ClassIn) -> dict:
    code, name, major = _validate_class(db, payload)
    cls = ClassRoom(code=code, name=name, major_id=major.id)
    db.add(cls); db.flush()
    audit_service.write_log(db, user_id=admin.id, action="create", target_type="class", target_id=cls.id, new_data={"code": cls.code, "name": cls.name, "major_id": cls.major_id})
    db.commit()
    return class_out(cls, major.name, 0)

def update_class(db: Session, admin: User, class_id: int, payload: ClassIn) -> dict:
    cls = _get_class_or_404(db, class_id)
    code, name, major = _validate_class(db, payload, class_id=class_id)
    old = {"code": cls.code, "name": cls.name, "major_id": cls.major_id}
    cls.code, cls.name, cls.major_id = code, name, major.id
    audit_service.write_log(db, user_id=admin.id, action="update", target_type="class", target_id=cls.id, old_data=old, new_data={"code": code, "name": name, "major_id": major.id})
    db.commit()
    return class_out(cls, major.name, _count_students(db, cls.id))

def delete_class(db: Session, admin: User, class_id: int) -> dict:
    cls = _get_class_or_404(db, class_id)
    if _count_students(db, cls.id) > 0: raise ApiError(400, "Không thể xóa lớp đang có sinh viên")
    audit_service.write_log(db, user_id=admin.id, action="delete", target_type="class", target_id=cls.id, old_data={"code": cls.code, "name": cls.name, "major_id": cls.major_id})
    db.delete(cls); db.commit()
    return {"ok": True}
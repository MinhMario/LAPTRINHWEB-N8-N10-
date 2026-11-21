"""Thống kê cho dashboard admin — API.md mục 6.7."""
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import ClassRoom, Major, ProfileUpdateRequest, Student
from app.schemas.student import avatar_url

def get_stats(db: Session) -> dict:
    total_students = db.query(func.count(Student.id)).scalar() or 0
    total_classes = db.query(func.count(ClassRoom.id)).scalar() or 0
    total_majors = db.query(func.count(Major.id)).scalar() or 0
    pending_requests = db.query(func.count(ProfileUpdateRequest.id)).filter(ProfileUpdateRequest.status == "pending").scalar() or 0
    class_rows = (db.query(ClassRoom.code, ClassRoom.name, func.count(Student.id))
                  .outerjoin(Student, Student.class_id == ClassRoom.id)
                  .group_by(ClassRoom.id, ClassRoom.code, ClassRoom.name).order_by(ClassRoom.code).all())
    recent_students = db.query(Student).order_by(Student.created_at.desc(), Student.id.desc()).limit(5).all()
    return {
        "total_students": total_students, "total_classes": total_classes,
        "total_majors": total_majors, "pending_requests": pending_requests,
        "by_class": [{"class_code": code, "class_name": name, "count": count} for code, name, count in class_rows],
        "recent": [{"id": s.id, "student_code": s.student_code, "full_name": s.full_name, "avatar_url": avatar_url(s)} for s in recent_students],
    }
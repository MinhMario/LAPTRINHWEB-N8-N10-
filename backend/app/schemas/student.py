"""Hình dạng JSON của sinh viên, đúng API.md mục 4.1 và 4.2."""
from datetime import date, datetime

from app.core.config import settings
from app.models import Student, User


def iso(value: date | datetime | None) -> str | None:
    return value.isoformat() if value else None


def avatar_url(student: Student) -> str:
    if student.avatar_filename:
        return f"/uploads/{student.avatar_filename}"
    return settings.DEFAULT_AVATAR_URL


def can_see_private(student: Student, viewer: User | None) -> bool:
    if viewer is None:
        return False
    return viewer.role == "admin" or student.user_id == viewer.id


def student_list_item(student: Student, viewer: User | None) -> dict:
    cls = student.classroom
    return {
        "id": student.id,
        "student_code": student.student_code,
        "full_name": student.full_name,
        "gender": student.gender,
        "email": student.email if viewer and viewer.role == "admin" else None,
        "avatar_url": avatar_url(student),
        "class_id": cls.id,
        "class_code": cls.code,
        "class_name": cls.name,
        "major_id": cls.major.id,
        "major_name": cls.major.name,
    }


def student_detail(student: Student, viewer: User | None) -> dict:
    cls = student.classroom
    private = can_see_private(student, viewer)
    skills = sorted(student.skills, key=lambda s: (-s.level, s.skill.name))
    links = sorted(student.social_links, key=lambda l: l.platform)
    return {
        "id": student.id,
        "student_code": student.student_code,
        "full_name": student.full_name,
        "gender": student.gender,
        "birth_date": iso(student.birth_date) if private else None,
        "email": student.email if private else None,
        "phone": student.phone if private else None,
        "address": student.address if private else None,
        "hobbies": student.hobbies,
        "avatar_url": avatar_url(student),
        "class_id": cls.id,
        "class_code": cls.code,
        "class_name": cls.name,
        "major_id": cls.major.id,
        "major_code": cls.major.code,
        "major_name": cls.major.name,
        "skills": [{"id": s.skill.id, "name": s.skill.name, "level": s.level} for s in skills],
        "social_links": [{"platform": l.platform, "url": l.url} for l in links],
        "created_at": iso(student.created_at),
        "updated_at": iso(student.updated_at),
    }
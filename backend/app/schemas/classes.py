"""Hình dạng JSON của lớp và ngành (API.md mục 4.3, 5.3, 6.5)."""
from pydantic import BaseModel


class MajorIn(BaseModel):
    code: str
    name: str


class ClassIn(BaseModel):
    code: str
    name: str
    major_id: int


def major_out(major, class_count: int) -> dict:
    return {"id": major.id, "code": major.code, "name": major.name, "class_count": class_count}


def class_out(cls, major_name: str, student_count: int) -> dict:
    return {
        "id": cls.id,
        "code": cls.code,
        "name": cls.name,
        "major_id": cls.major_id,
        "major_name": major_name,
        "student_count": student_count,
    }
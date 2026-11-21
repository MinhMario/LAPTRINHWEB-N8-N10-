"""Dành cho SINH VIÊN (Depends(student_required)) — API.md mục 6.3."""
from typing import Any

from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.deps import student_required
from app.core.errors import ApiError
from app.db.database import get_db
from app.models import ClassRoom, Student, StudentSkill, User
from app.schemas.student import student_detail
from app.services.request_service import list_my_requests, submit_request

router = APIRouter(tags=["Sinh viên - hồ sơ của tôi"])


def _get_current_student(db: Session, user: User) -> Student:
    student = (
        db.query(Student)
        .filter(Student.user_id == user.id)
        .options(
            joinedload(Student.classroom).joinedload(ClassRoom.major),
            selectinload(Student.skills).joinedload(StudentSkill.skill),
            selectinload(Student.social_links),
        )
        .first()
    )
    if not student:
        raise ApiError(404, "Không tìm thấy hồ sơ sinh viên")
    return student


@router.get("/me/profile", status_code=status.HTTP_200_OK)
def handle_get_my_profile(db: Session = Depends(get_db),
                          current_student: User = Depends(student_required)):
    student = _get_current_student(db, current_student)
    return student_detail(student, current_student)


@router.get("/me/update-requests", status_code=status.HTTP_200_OK)
def handle_list_my_requests(db: Session = Depends(get_db),
                            current_student: User = Depends(student_required)):
    student = _get_current_student(db, current_student)
    return list_my_requests(db=db, student=student)


@router.post("/me/update-requests", status_code=status.HTTP_201_CREATED)
def handle_create_my_request(data: Any = Body(None), db: Session = Depends(get_db),
                             current_student: User = Depends(student_required)):
    student = _get_current_student(db, current_student)
    return submit_request(db=db, student=student, data=data)
"""Sinh viên — API.md mục 6.2 (xem công khai) và 6.4 (admin thêm/sửa/xóa, xuất Excel)."""
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import admin_required, optional_user
from app.db.database import get_db
from app.models import User
from app.services.student_service import (
    list_students, get_student, export_students,
    create_student, update_student, delete_student,
)

router = APIRouter(tags=["Sinh viên"])

SortType = Literal["newest", "name", "class"]
XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def student_form(
    student_code: str = Form(""), full_name: str = Form(""), gender: str = Form(""),
    birth_date: str = Form(""), email: str = Form(""), phone: str = Form(""), class_id: str = Form(""),
    address: str | None = Form(None), hobbies: str | None = Form(None),
    skills: str | None = Form(None), social_links: str | None = Form(None),
) -> dict:
    return {
        "student_code": student_code, "full_name": full_name, "gender": gender,
        "birth_date": birth_date, "email": email, "phone": phone, "class_id": class_id,
        "address": address, "hobbies": hobbies, "skills": skills, "social_links": social_links,
    }


@router.get("/students", status_code=status.HTTP_200_OK)
def handle_list_students(q: str = "", class_id: int | None = None, major_id: int | None = None,
                         sort: SortType = "newest", page: int = Query(1, ge=1), page_size: int = Query(12, ge=1),
                         db: Session = Depends(get_db), viewer: User | None = Depends(optional_user)):
    return list_students(db=db, viewer=viewer, q=q, class_id=class_id, major_id=major_id,
                         sort=sort, page=page, page_size=page_size)


@router.get("/students/export", status_code=status.HTTP_200_OK)
def handle_export_students(q: str = "", class_id: int | None = None, major_id: int | None = None,
                           sort: SortType = "newest", db: Session = Depends(get_db),
                           current_admin: User = Depends(admin_required)):
    content = export_students(db=db, q=q, class_id=class_id, major_id=major_id, sort=sort)
    return Response(content=content, media_type=XLSX_MEDIA_TYPE,
                    headers={"Content-Disposition": 'attachment; filename="students.xlsx"'})


@router.get("/students/{student_id}", status_code=status.HTTP_200_OK)
def handle_get_student(student_id: int, db: Session = Depends(get_db),
                       viewer: User | None = Depends(optional_user)):
    return get_student(db=db, student_id=student_id, viewer=viewer)


@router.post("/students", status_code=status.HTTP_201_CREATED)
async def handle_create_student(data: dict = Depends(student_form), avatar: UploadFile | None = File(None),
                                db: Session = Depends(get_db), current_admin: User = Depends(admin_required)):
    return await create_student(db=db, admin=current_admin, data=data, avatar=avatar)


@router.put("/students/{student_id}", status_code=status.HTTP_200_OK)
async def handle_update_student(student_id: int, data: dict = Depends(student_form),
                                remove_avatar: str | None = Form(None), avatar: UploadFile | None = File(None),
                                db: Session = Depends(get_db), current_admin: User = Depends(admin_required)):
    should_remove = (remove_avatar or "").strip().lower() in ("1", "true", "on", "yes")
    return await update_student(db=db, admin=current_admin, student_id=student_id, data=data,
                                avatar=avatar, remove_avatar=should_remove)


@router.delete("/students/{student_id}", status_code=status.HTTP_200_OK)
def handle_delete_student(student_id: int, db: Session = Depends(get_db),
                          current_admin: User = Depends(admin_required)):
    return delete_student(db=db, admin=current_admin, student_id=student_id)
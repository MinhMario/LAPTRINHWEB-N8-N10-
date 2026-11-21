"""Lớp và ngành — API.md mục 6.2 (xem công khai) và 6.5 (admin thêm/sửa/xóa)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import admin_required, optional_user
from app.db.database import get_db
from app.models import User
from app.schemas.classes import ClassIn, MajorIn
from app.services.class_service import (
    list_majors, create_major, update_major, delete_major,
    list_classes, create_class, update_class, delete_class,
)

router = APIRouter(tags=["Lớp và ngành"])


@router.get("/majors", status_code=status.HTTP_200_OK)
def handle_list_majors(db: Session = Depends(get_db), viewer: User | None = Depends(optional_user)):
    return list_majors(db=db)


@router.post("/majors", status_code=status.HTTP_201_CREATED)
def handle_create_major(payload: MajorIn, db: Session = Depends(get_db),
                        current_admin: User = Depends(admin_required)):
    return create_major(db=db, admin=current_admin, payload=payload)


@router.put("/majors/{major_id}", status_code=status.HTTP_200_OK)
def handle_update_major(major_id: int, payload: MajorIn, db: Session = Depends(get_db),
                        current_admin: User = Depends(admin_required)):
    return update_major(db=db, admin=current_admin, major_id=major_id, payload=payload)


@router.delete("/majors/{major_id}", status_code=status.HTTP_200_OK)
def handle_delete_major(major_id: int, db: Session = Depends(get_db),
                        current_admin: User = Depends(admin_required)):
    return delete_major(db=db, admin=current_admin, major_id=major_id)


@router.get("/classes", status_code=status.HTTP_200_OK)
def handle_list_classes(major_id: int | None = None, db: Session = Depends(get_db),
                        viewer: User | None = Depends(optional_user)):
    return list_classes(db=db, major_id=major_id)


@router.post("/classes", status_code=status.HTTP_201_CREATED)
def handle_create_class(payload: ClassIn, db: Session = Depends(get_db),
                        current_admin: User = Depends(admin_required)):
    return create_class(db=db, admin=current_admin, payload=payload)


@router.put("/classes/{class_id}", status_code=status.HTTP_200_OK)
def handle_update_class(class_id: int, payload: ClassIn, db: Session = Depends(get_db),
                        current_admin: User = Depends(admin_required)):
    return update_class(db=db, admin=current_admin, class_id=class_id, payload=payload)


@router.delete("/classes/{class_id}", status_code=status.HTTP_200_OK)
def handle_delete_class(class_id: int, db: Session = Depends(get_db),
                        current_admin: User = Depends(admin_required)):
    return delete_class(db=db, admin=current_admin, class_id=class_id)
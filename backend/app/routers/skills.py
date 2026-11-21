"""Gợi ý kỹ năng khi nhập (sinh viên và admin) — API.md mục 6.4."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import login_required
from app.db.database import get_db
from app.models import User
from app.services.student_service import list_skills

router = APIRouter(tags=["Kỹ năng"])


@router.get("/skills", status_code=status.HTTP_200_OK)
def handle_list_skills(q: str = "", db: Session = Depends(get_db),
                       current_user: User = Depends(login_required)):
    return list_skills(db=db, q=q)
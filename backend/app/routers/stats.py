"""Thống kê cho dashboard admin — API.md mục 6.7."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import admin_required
from app.db.database import get_db
from app.models import User
from app.services.stats_service import get_stats

router = APIRouter(tags=["Admin - thống kê"])


@router.get("/stats", status_code=status.HTTP_200_OK)
def handle_get_stats(db: Session = Depends(get_db), current_admin: User = Depends(admin_required)):
    return get_stats(db=db)
"""Nhật ký thao tác (chỉ admin) — API.md mục 6.7."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import admin_required
from app.db.database import get_db
from app.models import User
from app.services.audit_service import list_audit_logs

router = APIRouter(tags=["Admin - nhật ký"])


@router.get("/audit-logs", status_code=status.HTTP_200_OK)
def handle_list_audit_logs(target_type: str = "", target_id: int | None = None, action: str = "",
                           page: int = Query(1, ge=1), page_size: int = Query(20, ge=1),
                           db: Session = Depends(get_db), current_admin: User = Depends(admin_required)):
    return list_audit_logs(db=db, target_type=target_type, target_id=target_id, action=action,
                           page=page, page_size=page_size)
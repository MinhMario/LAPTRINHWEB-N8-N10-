"""Admin duyệt yêu cầu cập nhật hồ sơ (Depends(admin_required)) — API.md mục 6.6."""
from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import admin_required
from app.db.database import get_db
from app.models import User
from app.services.request_service import (
    RequestStatus,
    list_requests,
    get_request_detail,
    approve_request,
    reject_request,
)

router = APIRouter(tags=["Admin - duyệt yêu cầu"])


@router.get("/update-requests", status_code=status.HTTP_200_OK)
def handle_list_requests(status_filter: RequestStatus = Query("pending", alias="status"),
                         page: int = Query(1, ge=1), page_size: int = Query(10, ge=1),
                         db: Session = Depends(get_db), current_admin: User = Depends(admin_required)):
    return list_requests(db=db, status=status_filter, page=page, page_size=page_size)


@router.get("/update-requests/{request_id}", status_code=status.HTTP_200_OK)
def handle_get_request(request_id: int, db: Session = Depends(get_db),
                       current_admin: User = Depends(admin_required)):
    return get_request_detail(db=db, request_id=request_id)


@router.post("/update-requests/{request_id}/approve", status_code=status.HTTP_200_OK)
def handle_approve_request(request_id: int, db: Session = Depends(get_db),
                           current_admin: User = Depends(admin_required)):
    return approve_request(db=db, admin=current_admin, request_id=request_id)


@router.post("/update-requests/{request_id}/reject", status_code=status.HTTP_200_OK)
def handle_reject_request(request_id: int, payload: dict | None = Body(None),
                          db: Session = Depends(get_db), current_admin: User = Depends(admin_required)):
    reason = payload.get("reject_reason") if isinstance(payload, dict) else None
    return reject_request(db=db, admin=current_admin, request_id=request_id, reject_reason=reason)
"""Nhật ký thao tác (bảng audit_logs)."""
from sqlalchemy.orm import Session
from app.core.errors import ApiError
from app.models import AuditLog, User
from app.schemas.student import iso
from app.services.common import paginate

TARGET_TYPES = ("student", "class", "major")
ACTIONS = ("create", "update", "delete", "approve", "reject")

def write_log(db: Session, *, user_id: int, action: str, target_type: str, target_id: int,
              old_data: dict | None = None, new_data: dict | None = None) -> AuditLog:
    if target_type not in TARGET_TYPES: raise ValueError(f"target_type không hợp lệ: {target_type}")
    log = AuditLog(user_id=user_id, action=action, target_type=target_type, target_id=target_id, old_data=old_data, new_data=new_data)
    db.add(log)
    return log

def _log_out(row) -> dict:
    log, username = row
    return {"id": log.id, "username": username, "action": log.action, "target_type": log.target_type,
            "target_id": log.target_id, "old_data": log.old_data, "new_data": log.new_data, "created_at": iso(log.created_at)}

def list_audit_logs(db: Session, target_type: str = "", target_id: int | None = None,
                    action: str = "", page: int = 1, page_size: int = 20) -> dict:
    query = db.query(AuditLog, User.username).join(User, AuditLog.user_id == User.id)
    target_type = target_type.strip()
    if target_type:
        if target_type not in TARGET_TYPES: raise ApiError(400, "Dữ liệu không hợp lệ", field="target_type")
        query = query.filter(AuditLog.target_type == target_type)
    if target_id is not None: query = query.filter(AuditLog.target_id == target_id)
    action = action.strip()
    if action:
        if action not in ACTIONS: raise ApiError(400, "Dữ liệu không hợp lệ", field="action")
        query = query.filter(AuditLog.action == action)
    return paginate(query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()), page=page, page_size=page_size, mapper=_log_out)
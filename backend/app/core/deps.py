"""Dependency dùng chung: ai gọi được endpoint nào (khách / sinh viên / admin)."""
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.db.database import get_db
from app.models import User


def _must_change() -> ApiError:
    return ApiError(403, "Bạn cần đổi mật khẩu trước khi tiếp tục", code="MUST_CHANGE_PASSWORD")


def _load_user(request: Request, db: Session) -> User | None:
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        request.session.clear()
        return None
    return user


def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    user = _load_user(request, db)
    if user and user.must_change_password:
        raise _must_change()
    return user


def user_allow_pwchange(request: Request, db: Session = Depends(get_db)) -> User:
    user = _load_user(request, db)
    if user is None:
        raise ApiError(401, "Bạn chưa đăng nhập")
    return user


def login_required(user: User = Depends(user_allow_pwchange)) -> User:
    if user.must_change_password:
        raise _must_change()
    return user


def _forbidden() -> ApiError:
    return ApiError(403, "Bạn không có quyền thực hiện thao tác này")


def admin_required(user: User = Depends(login_required)) -> User:
    if user.role != "admin":
        raise _forbidden()
    return user


def student_required(user: User = Depends(login_required)) -> User:
    if user.role != "student":
        raise _forbidden()
    return user
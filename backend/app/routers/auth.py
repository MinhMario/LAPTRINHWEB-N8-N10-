"""Xác thực: login, logout, me, change-password (API.md mục 6.1)."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import user_allow_pwchange
from app.core.errors import ApiError
from app.core.rate_limit import login_limiter
from app.core.security import hash_password, verify_password
from app.db.database import get_db
from app.models import Student, User
from app.schemas.auth import ChangePasswordIn, LoginIn

router = APIRouter(tags=["Xác thực"])

# Chống dò mật khẩu: tối đa 20 lần / 5 phút cho mỗi IP, và 10 lần / 5 phút cho mỗi tài khoản.
LOGIN_IP_LIMIT = 20
LOGIN_ACCOUNT_LIMIT = 10
LOGIN_WINDOW_SECONDS = 5 * 60


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded.strip():
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/login")
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    client_ip = _client_ip(request)
    login_limiter.check(f"login:ip:{client_ip}", limit=LOGIN_IP_LIMIT, window_seconds=LOGIN_WINDOW_SECONDS)
    login_limiter.check(f"login:user:{data.username.strip().lower()}", limit=LOGIN_ACCOUNT_LIMIT,
                        window_seconds=LOGIN_WINDOW_SECONDS)

    user = db.scalar(select(User).where(User.username == data.username))
    if user is None or not verify_password(data.password, user.password_hash):
        raise ApiError(401, "Sai tên đăng nhập hoặc mật khẩu")
    if not user.is_active:
        raise ApiError(403, "Tài khoản đã bị khóa", code="ACCOUNT_LOCKED")

    request.session.clear()
    request.session["user_id"] = user.id
    return {
        "ok": True,
        "username": user.username,
        "role": user.role,
        "must_change_password": user.must_change_password,
    }


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(user_allow_pwchange), db: Session = Depends(get_db)):
    student_id = db.scalar(select(Student.id).where(Student.user_id == user.id))
    return {
        "username": user.username,
        "role": user.role,
        "must_change_password": user.must_change_password,
        "student_id": student_id,
    }


@router.post("/change-password")
def change_password(
    data: ChangePasswordIn,
    user: User = Depends(user_allow_pwchange),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, user.password_hash):
        raise ApiError(400, "Mật khẩu hiện tại không đúng", field="current_password")
    if len(data.new_password) < 8:
        raise ApiError(400, "Mật khẩu mới phải có ít nhất 8 ký tự", field="new_password")
    if data.new_password == data.current_password:
        raise ApiError(400, "Mật khẩu mới phải khác mật khẩu hiện tại", field="new_password")

    user.password_hash = hash_password(data.new_password)
    user.must_change_password = False
    db.commit()
    return {"ok": True}
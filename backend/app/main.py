"""Điểm vào của ứng dụng.  Chạy:  uvicorn app.main:app --reload"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.rate_limit import login_limiter
from app.db.database import init_sqlite_db
from app.routers import audit, auth, classes, me, requests, skills, stats, students


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Mỗi lần khởi động server là một phiên mới: không giữ bộ đếm đăng nhập của lần chạy trước
    # (pytest dùng TestClient trong cùng tiến trình nên cần dọn sạch để test độc lập).
    login_limiter.clear()
    # Chế độ SQLite: tự tạo bảng + dữ liệu mẫu nếu chưa có file student.db
    if init_sqlite_db():
        print(f"[sqlite] Đã tạo CSDL mẫu: {settings.SQLITE_PATH}")
    yield


app = FastAPI(
    title="Quản lý hồ sơ sinh viên",
    description="Xem API.md để biết hợp đồng chi tiết.",
    lifespan=lifespan,
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=settings.SESSION_MAX_AGE,
    same_site="lax",
    https_only=False,
)

register_error_handlers(app)

for module in (auth, students, classes, skills, me, requests, audit, stats):
    app.include_router(module.router, prefix="/api")

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.FRONTEND_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/", StaticFiles(directory=settings.FRONTEND_DIR, html=True), name="frontend")
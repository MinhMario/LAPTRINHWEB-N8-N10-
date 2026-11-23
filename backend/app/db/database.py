"""Kết nối CSDL.

Có 2 chế độ, chọn bằng `DB_ENGINE` trong `.env`:
  - `mysql`  (mặc định): dùng MySQL + `sql/schema.sql`, bảng do schema.sql tạo.
  - `sqlite` : dùng 1 file `student.db` ngay trong `backend/`, KHÔNG cần cài MySQL.
               Bảng được tạo tự động bằng `init_sqlite_db()` khi server khởi động
               (hoặc tạo sẵn file mẫu bằng `python sql/init_sqlite.py`).

Không dùng create_all() cho MySQL — chỉ dùng cho SQLite.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _create_engine():
    if settings.IS_SQLITE:
        settings.SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
        return create_engine(
            settings.DATABASE_URL,
            # FastAPI chạy endpoint trong threadpool nên cần tắt kiểm tra thread của SQLite
            connect_args={"check_same_thread": False},
        )
    return create_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)


engine = _create_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_sqlite_db() -> bool:
    """Tạo bảng + dữ liệu mẫu cho SQLite nếu file DB chưa có. Trả về True nếu vừa khởi tạo."""
    if not settings.IS_SQLITE:
        return False
    import app.models  # noqa: F401  (đăng ký đủ model vào Base)

    if settings.SQLITE_PATH.exists():
        return False
    Base.metadata.create_all(bind=engine)
    _seed_sqlite()
    return True


def _seed_sqlite() -> None:
    import json

    from app.db.seed_data import SEED_STATEMENTS

    with engine.begin() as conn:
        for model, rows in SEED_STATEMENTS:
            if not rows:
                continue
            payload = [
                {k: (json.dumps(v) if isinstance(v, (dict, list)) else v) for k, v in row.items()}
                for row in rows
            ]
            conn.execute(model.__table__.insert(), payload)


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

"""Tạo lại file CSDL SQLite (student.db) với dữ liệu mẫu — dùng khi chạy KHÔNG cần MySQL.

Chạy từ thư mục backend/:
    python sql/init_sqlite.py

Script sẽ XOÁ file student.db cũ (nếu có) rồi tạo mới, sau đó in ra số dòng đã nạp.
Muốn đổi nơi lưu file: đặt SQLITE_PATH trong .env (mặc định backend/student.db).
"""
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

os.environ["DB_ENGINE"] = "sqlite"  # script này luôn dựng bản SQLite, không đụng tới MySQL

from app.core.config import settings  # noqa: E402

if not settings.IS_SQLITE:
    sys.exit("DB_ENGINE phải là 'sqlite' để chạy script này.")

from app.db.database import Base, engine, _seed_sqlite  # noqa: E402
import app.models  # noqa: E402,F401  (đăng ký model vào Base)

db_path = settings.SQLITE_PATH
if db_path.exists():
    db_path.unlink()
    print(f"Da xoa file cu: {db_path}")

Base.metadata.create_all(bind=engine)
_seed_sqlite()

with engine.connect() as conn:
    from sqlalchemy import text

    students = conn.execute(text("SELECT COUNT(*) FROM students")).scalar_one()
    users = conn.execute(text("SELECT COUNT(*) FROM users")).scalar_one()

print(f"Tao xong {db_path}")
print(f"  users={users}, students={students}  (admin/123456, B24DTCN001/Ptit@2026)")

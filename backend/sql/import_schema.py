"""Nạp backend/sql/schema.sql vào MySQL (tạo lại DB student_db) — dùng khi không có client `mysql`.

Chạy từ thư mục backend/:
    python sql/import_schema.py
"""
import os
from pathlib import Path

import pymysql
from dotenv import load_dotenv

BACKEND = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND / ".env")

conn = pymysql.connect(
    host=os.getenv("DB_HOST", "127.0.0.1"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    charset="utf8mb4",
    autocommit=True,
    client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS,
)
try:
    with conn.cursor() as cur:
        cur.execute((BACKEND / "sql" / "schema.sql").read_text(encoding="utf-8-sig"))
        while cur.nextset():
            pass
        cur.execute("SELECT COUNT(*) FROM student_db.students")
        # Console Windows mặc định cp1252/cp437: in chuỗi không dấu để không bị UnicodeEncodeError
        print(f"schema.sql imported OK - {cur.fetchone()[0]} students in student_db.")
finally:
    conn.close()

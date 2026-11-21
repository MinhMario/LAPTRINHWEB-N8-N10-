# Website quản lý hồ sơ sinh viên

Bài tập nhóm môn Lập trình Web. Back-end Python (FastAPI) + MySQL, front-end HTML/CSS/JS tĩnh gọi API bằng `fetch`.

| Tài liệu | Nội dung |
|---|---|
| `API.md` | Hợp đồng API giữa front-end và back-end (nguồn duy nhất, đổi API thì sửa file này trước) |
| `FRONTEND_GUIDE.md` | Quy ước viết front-end, cấu trúc `frontend/` |
| `schema.sql` | Tạo CSDL `student_db` (9 bảng) kèm dữ liệu mẫu |

## 1. Chạy dự án

Cần: **Python 3.10+** và **MySQL 8** (hoặc MariaDB 10.5+, đã thử trên MariaDB 10.11).

```bash
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # macOS / Linux

pip install -r requirements.txt

copy .env.example .env           # Windows   (macOS/Linux: cp .env.example .env)
# mở .env, sửa DB_USER / DB_PASSWORD cho khớp MySQL của bạn

mysql -u root -p < schema.sql    # tạo DB + dữ liệu mẫu (chạy lại sẽ XÓA và tạo mới DB student_db)

uvicorn app.main:app --reload
```

- Giao diện: <http://localhost:8000/>  (FastAPI phục vụ luôn thư mục `frontend/`; **luôn vào qua địa chỉ này**, không mở file HTML trực tiếp)
- Thử API: <http://localhost:8000/docs>
- Ảnh: <http://localhost:8000/uploads/...>

Tài khoản mẫu:

| Tài khoản | Mật khẩu | Ghi chú |
|---|---|---|
| `admin` | `123456` | Admin |
| `B24DTCN001` | `Ptit@2026` | Sinh viên, không bị buộc đổi mật khẩu |
| `B24DTCN002` … `025` | `Ptit@2026` | Sinh viên, bị buộc đổi mật khẩu ở lần đăng nhập đầu |

## 2. Kiểm thử

```bash
pytest -v
```

Test chạy trên CSDL thật (đã nạp `schema.sql`). Chúng chỉ đọc dữ liệu, riêng test đổi mật khẩu của `B24DTCN002` sẽ tự trả về trạng thái ban đầu. Cảnh báo `httpx ... deprecated` có thể bỏ qua.

## 3. Cấu trúc

```
app/
├── main.py           # tạo FastAPI, session, gắn router, mount frontend/ và uploads/
├── config.py         # đọc .env
├── database.py       # kết nối CSDL, get_db
├── deps.py           # ai gọi được endpoint nào: optional_user / login_required / admin_required / student_required
├── errors.py         # mọi lỗi về dạng {error, field, code?}; lỗi validate 422 -> 400
├── security.py       # băm mật khẩu (bcrypt)
├── models/           # SQLAlchemy, mỗi bảng một file (9 bảng)
├── schemas/          # hình dạng JSON vào/ra (khớp API.md)
├── routers/          # chỉ nhận request và trả JSON, giữ mỏng
└── services/         # NGHIỆP VỤ + giao dịch (tài liệu CSDL mục 4)
frontend/             # front-end (xem FRONTEND_GUIDE.md)
uploads/              # ảnh đại diện (chỉ commit default-avatar.png)
tests/
```

## 4. Tiến độ (theo mốc trong API.md mục 8)

| Mốc | Endpoint | Trạng thái |
|---|---|---|
| 1 | `GET /api/majors`, `/api/classes`, `/api/students`, `/api/students/{id}` | **Xong**, có test |
| 2 | `POST /api/login`, `/api/logout`, `GET /api/me`, `POST /api/change-password` | **Xong**, có test |
| 2 | `GET /api/stats` | Chưa (`routers/stats.py`) |
| 3 | `POST/PUT/DELETE /api/students`, `GET /api/skills` | Chưa. `upload_service.py` đã viết sẵn và có test; chỗ cần làm: `services/student_service.py` |
| 4 | CRUD `classes`, `majors` | Chưa (`routers/classes.py`) |
| 5 | `me/profile`, `me/update-requests`, `update-requests` (duyệt/từ chối) | Chưa (`routers/me.py`, `requests.py`, `services/request_service.py`) |
| 6 | `GET /api/audit-logs` | Chưa (`routers/audit.py`); `audit_service.write_log()` đã sẵn |
| 7 | `GET /api/students/export` | Tùy chọn |

Các file chưa làm đều có ghi chú **TODO** ghi rõ endpoint và quy tắc nghiệp vụ cần thực hiện.

## 5. Cách viết thêm một endpoint

1. Đọc mục tương ứng trong `API.md` (đầu vào, đầu ra, lỗi).
2. Router chỉ nhận dữ liệu và gọi service; chọn quyền bằng dependency (`admin_required`...).
3. Nghiệp vụ nhiều bảng viết trong `services/`: **một giao dịch**, ghi `audit_service.write_log(...)` rồi `db.commit()` một lần ở cuối.
4. Báo lỗi bằng `raise ApiError(400, "Thông báo tiếng Việt", field="ten_truong")`, không tự dựng JSON lỗi.
5. Thêm test vào `tests/`.

## 6. Lưu ý

- **Không dùng `create_all()`**. Bảng do `schema.sql` tạo. Đổi cấu trúc bảng thì sửa đồng thời `schema.sql`, `app/models/`, và `API.md` nếu JSON đổi.
- `pending_flag` trong `profile_update_requests` là cột tự tính, không ghi tay.
- Đổi `SECRET_KEY` trong `.env`; không commit file `.env`.
- Phân công Git: back-end chỉ sửa `app/`, `tests/`, `schema.sql`, `API.md`; front-end chỉ sửa `frontend/`.

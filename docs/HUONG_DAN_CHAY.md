# Hướng dẫn cài đặt và chạy dự án

Website quản lý hồ sơ sinh viên sử dụng **Back-end Python (FastAPI) + MySQL** và **Front-end HTML/CSS/JS tĩnh**. Back-end phục vụ luôn thư mục `frontend/`, nên chỉ cần chạy **1 server duy nhất** ở cổng `8000`.

---

## 1. Cấu trúc thư mục hiện tại

```text
Laptrinhweb(n8-n10)/
├── backend/
│   ├── .env                 # Cấu hình kết nối MySQL (không commit lên Git)
│   ├── .env.example         # File cấu hình mẫu
│   ├── requirements.txt     # Thư viện Python cần thiết
│   ├── app/                 # Mã nguồn FastAPI (core, db, models, routers, schemas, services)
│   ├── sql/schema.sql       # Script tạo CSDL student_db + dữ liệu mẫu (1 admin, 20 sinh viên)
│   ├── tests/test_smoke.py  # Bộ kiểm thử tự động (pytest)
│   └── uploads/             # Thư mục lưu ảnh đại diện
├── docs/                    # Tài liệu dự án (API.md, FRONTEND_GUIDE.md, HUONG_DAN_CHAY.md)
├── frontend/                # Giao diện web (index.html, pages/, css/, js/)
└── README.md
```

---

## 2. Yêu cầu môi trường

- **Python 3.10+**
- **MySQL 8+** (hoặc MariaDB 10.5+) đang chạy ở cổng `3306`

---

## 3. Cài đặt lần đầu (nếu chạy trên máy mới)

### Bước 1: Cài đặt thư viện Python
Mở PowerShell tại thư mục `Laptrinhweb(n8-n10)\backend`:

```powershell
cd "f:\New folder\.vscode\API\Laptrinhweb(n8-n10)\backend"
python -m venv ..\..\venv
..\..\venv\Scripts\python.exe -m pip install -r requirements.txt
```

*(Nếu đã có sẵn môi trường ảo `venv` ở thư mục cha `API\venv`, bạn có thể bỏ qua bước tạo venv và cài đặt lại.)*

### Bước 2: Cấu hình file `.env`
Sao chép `.env.example` thành `.env` trong `backend/` và sửa `DB_USER`, `DB_PASSWORD` cho khớp với MySQL trên máy:

```powershell
copy .env.example .env
```

Nội dung mẫu trong `backend\.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mat_khau_mysql_cua_ban
DB_NAME=student_db

SECRET_KEY=doi-chuoi-nay-thanh-chuoi-ngau-nhien-dai
DEFAULT_STUDENT_PASSWORD=Ptit@2026
UPLOAD_DIR=uploads
MAX_AVATAR_MB=2
```

### Bước 3: Nạp CSDL và dữ liệu mẫu
Chạy file `backend\sql\schema.sql` vào MySQL để tạo database `student_db` (gồm **1 admin** và **20 sinh viên mẫu**):

```powershell
mysql -u root -p < sql\schema.sql
```

> **Lưu ý:** Chạy lại `schema.sql` sẽ xóa và tạo mới lại toàn bộ bảng cùng dữ liệu mẫu trong `student_db`.

---

## 4. Chạy Back-end và Front-end

Mở PowerShell tại thư mục `Laptrinhweb(n8-n10)\backend` và chạy:

```powershell
cd "f:\New folder\.vscode\API\Laptrinhweb(n8-n10)\backend"
..\..\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Khi thấy dòng `Application startup complete.` và `Uvicorn running on http://127.0.0.1:8000`, mở trình duyệt tại:

- **Trang chủ (Front-end):** http://localhost:8000/
- **Tài liệu & thử API (Swagger UI):** http://localhost:8000/docs

> **Quan trọng:** Luôn truy cập giao diện qua `http://localhost:8000/`. **Không** mở trực tiếp file `.html` bằng trình duyệt hoặc dùng Live Server vì khác origin sẽ bị mất cookie đăng nhập.

---

## 5. Tài khoản đăng nhập mẫu

| Vai trò | Tên đăng nhập | Mật khẩu | Ghi chú |
|---|---|---|---|
| **Admin** | `admin` | `123456` | Toàn quyền quản lý sinh viên, lớp/ngành, duyệt yêu cầu, xem nhật ký |
| **Sinh viên** | `B24DTCN001` | `Ptit@2026` | Đăng nhập thẳng vào trang hồ sơ sinh viên |
| **Sinh viên** | `B24DTCN002` … `B24DTCN020` | `Ptit@2026` | Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên |

---

## 6. Chạy kiểm thử tự động (`pytest`)

Tại thư mục `Laptrinhweb(n8-n10)\backend`:

```powershell
..\..\venv\Scripts\python.exe -m pytest -v
```

Bộ test sẽ kiểm tra toàn bộ API (20 test case) trực tiếp trên MySQL `student_db` và tự dọn dữ liệu tạm sau khi chạy xong.

---

## 7. Xử lý lỗi thường gặp

- **`Access denied for user 'root'@'localhost'`**: Sai `DB_USER` hoặc `DB_PASSWORD` trong `backend\.env`.
- **`Unknown database 'student_db'`**: Chưa nạp `backend\sql\schema.sql` vào MySQL.
- **`Can't connect to MySQL server`**: Dịch vụ MySQL chưa được bật trên máy.
- **Mất đăng nhập / 401 liên tục trên Front-end**: Đang mở file HTML trực tiếp hoặc qua cổng khác (ví dụ `:5500` của Live Server) thay vì `http://localhost:8000/`.

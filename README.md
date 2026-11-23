# Website quản lý hồ sơ sinh viên

Bài tập nhóm môn Lập trình Web. Back-end Python (FastAPI) + MySQL, front-end HTML/CSS/JS tĩnh gọi API bằng `fetch`.

| Tài liệu | Nội dung |
|---|---|
| `API.md` | Hợp đồng API giữa front-end và back-end (nguồn duy nhất, đổi API thì sửa file này trước) |
| `FRONTEND_GUIDE.md` | Quy ước viết front-end, cấu trúc `frontend/` |
| `schema.sql` | Tạo CSDL `student_db` (9 bảng) kèm dữ liệu mẫu — dùng cho chế độ MySQL |
| `HUONG_DAN_CHAY.md` | Bản hướng dẫn chạy chi tiết hơn (từng bước, xử lý lỗi thường gặp) |

> Các tài liệu `API.md`, `FRONTEND_GUIDE.md`, `HUONG_DAN_CHAY.md` nằm trong thư mục `docs/`.
> Toàn bộ lệnh chạy dự án thực hiện trong thư mục `backend/`.

## 1. Chạy dự án

### Cần có trước khi bắt đầu

1. **Python 3.10 trở lên** — kiểm tra bằng `python --version`.
2. **Một trong hai loại CSDL:**
   - **SQLite** (khuyên dùng để demo/nộp bài): **không cần cài gì thêm**, dùng file `backend/student.db` tự sinh ra.
   - **MySQL 8** (hoặc MariaDB 10.5+): cài đặt và bật ở cổng `3306`; cần biết mật khẩu `root`.

> 💡 **Nhớ một điều duy nhất:** mọi lệnh bên dưới đều chạy **trong thư mục `backend/`**,
> không phải thư mục gốc `Laptrinhweb(n8-n10)/`.

---

### Bước 1. Mở terminal tại thư mục `backend/`

Trong VS Code: mở thư mục dự án → mở Terminal → gõ:

```bash
cd backend
```

Nếu terminal đang ở chỗ khác, dùng đường dẫn đầy đủ tới thư mục `backend/` của bạn.

---

### Bước 2. Tạo môi trường ảo và cài thư viện

Môi trường ảo (`venv`) là "hộp riêng" chứa thư viện của dự án, không làm bẩn Python của máy.

**Windows (PowerShell hoặc CMD):**

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Dấu hiệu thành công: đầu dòng lệnh xuất hiện chữ `(venv)`.

<details>
<summary>Lỗi hay gặp ở bước này</summary>

- *"running scripts is disabled on this system"* (PowerShell) → chạy
  `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` rồi làm lại lệnh `activate`.
- *Không tìm thấy `python`* → thử `py -3 -m venv venv` (Windows) hoặc `python3` (macOS/Linux).
- *`pip` lỗi mạng* → thử `pip install -r requirements.txt --index-url https://pypi.org/simple`.

</details>

---

### Bước 3. Tạo file `.env` (cấu hình kết nối MySQL)

**Windows:**

```powershell
copy .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Mở file `backend/.env` vừa tạo. Có **2 chế độ CSDL** — chọn 1:

#### Chế độ A — SQLite (không cần cài MySQL, khuyên dùng)

Chỉ cần dòng này, các dòng `DB_*` bên dưới **để nguyên**, có thể bỏ qua:

```env
DB_ENGINE=sqlite
```

Bảng và dữ liệu mẫu sẽ được tạo tự động ở lần chạy server đầu tiên (file `backend/student.db`).
Muốn tạo lại từ đầu: `python sql/init_sqlite.py`.

#### Chế độ B — MySQL (đúng thiết kế môn học)

```env
DB_ENGINE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mat_khau_mysql_cua_ban   # ← SỬA DÒNG NÀY
DB_NAME=student_db
```

> Nếu MySQL của bạn **không có mật khẩu** (một số bản XAMPP), để trống: `DB_PASSWORD=`

Các dòng còn lại dùng chung cho cả 2 chế độ:

```env
SECRET_KEY=doi-chuoi-nay-thanh-chuoi-ngau-nhien-dai   # nên đổi khi chạy thật
DEFAULT_STUDENT_PASSWORD=Ptit@2026
UPLOAD_DIR=uploads
MAX_AVATAR_MB=2
```

---

### Bước 4. Tạo cơ sở dữ liệu và dữ liệu mẫu

> ✅ **Đang dùng SQLite (chế độ A)?** **Bỏ qua bước này** — CSDL tự tạo khi chạy server.
> Sau khi chạy, bạn có thể chạy `python sql/init_sqlite.py` bất cứ lúc nào để reset về dữ liệu mẫu.

Với **MySQL (chế độ B)**, lệnh dưới tạo database `student_db` gồm 4 ngành, 5 lớp, **1 admin + 20 sinh viên mẫu**.

**Cách 1 — Có lệnh `mysql` (dễ nhất):**

```bash
mysql -u root -p < sql/schema.sql
```

Nhập mật khẩu `root` khi được hỏi.

**Cách 2 — Không có lệnh `mysql`:** chạy script Python có sẵn (tự đọc thông tin từ `.env`):

```bash
python sql/import_schema.py
```

Kết quả mong đợi: `schema.sql imported OK - 20 students in student_db.`

**Cách 3 — Dùng giao diện:** mở MySQL Workbench / HeidiSQL / phpMyAdmin → mở file
`backend/sql/schema.sql` → Run.

> ⚠️ **Chạy lại bước này sẽ XÓA SẠCH** database `student_db` (mất mọi dữ liệu đã thêm/sửa)
> rồi tạo lại dữ liệu mẫu.

<details>
<summary>Xem nhanh: chạy hoàn toàn KHÔNG cần MySQL</summary>

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env           # .env.example đã sẵn DB_ENGINE=sqlite
uvicorn app.main:app --reload
```

Mở <http://localhost:8000/> → đăng nhập `admin` / `123456`. Xong!

</details>

---

### Bước 5. Chạy server
cd backend sau đó
```bash
uvicorn app.main:app --reload
```

Thành công khi terminal hiện:

```
Application startup complete.
Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

> Cổng 8000 bị chiếm? Đổi cổng: `uvicorn app.main:app --reload --port 8080`
> (nhớ dùng `localhost:8080` khi mở trình duyệt).

---

### Bước 6. Mở trình duyệt

| Muốn xem | Mở địa chỉ |
|---|---|
| **Giao diện web** | <http://localhost:8000/> |
| **Thử API (Swagger)** | <http://localhost:8000/docs> |
| Ảnh đại diện | `http://localhost:8000/uploads/...` |

> Ở chế độ SQLite, terminal sẽ in `[sqlite] Đã tạo CSDL mẫu: ...\backend\student.db` ở lần chạy đầu tiên.

**Tài khoản để đăng nhập thử:**

| Tài khoản | Mật khẩu | Vào được gì |
|---|---|---|
| `admin` | `123456` | Toàn bộ trang quản trị (sinh viên, lớp/ngành, duyệt yêu cầu, nhật ký) |
| `B24DTCN001` | `Ptit@2026` | Hồ sơ sinh viên, không bị buộc đổi mật khẩu |
| `B24DTCN002` … `B24DTCN020` | `Ptit@2026` | Sinh viên, **buộc đổi mật khẩu** ở lần đăng nhập đầu |

> ❗ **Đừng** mở trực tiếp file `.html` (double-click) và **đừng** dùng Live Server (`:5500`).
> Phải vào qua `http://localhost:8000/`, nếu không sẽ mất cookie đăng nhập và bị đá về trang login liên tục.

---

### Bước 7. Dừng server

Quay lại terminal đang chạy `uvicorn` và bấm **`Ctrl + C`**.

Lần sau muốn chạy lại, chỉ cần 3 lệnh:

```bash
cd backend
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
uvicorn app.main:app --reload
```

(không cần cài lại thư viện, không cần nạp lại CSDL — trừ khi bạn muốn reset dữ liệu)

---

### Kiểm tra nhanh server đã nối được CSDL (không cần mở trình duyệt)

```powershell
# Windows PowerShell
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri http://localhost:8000/api/login -Method Post -ContentType "application/json" `
  -Body '{"username":"admin","password":"123456"}' -WebSession $s
Invoke-RestMethod -Uri http://localhost:8000/api/me -WebSession $s
```

```bash
# macOS / Linux
curl -c cookie.txt -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' http://localhost:8000/api/login
curl -b cookie.txt http://localhost:8000/api/me
```

Kết quả đúng phải có `"ok": true` và `"role": "admin"`. Nếu lỗi → tra bảng dưới.

---

### Lỗi thường gặp — tra theo thông báo trên màn hình

| Thông báo / hiện tượng | Cách sửa |
|---|---|
| `Access denied for user 'root'@'localhost'` | Đang dùng chế độ **MySQL**: sai `DB_PASSWORD` trong `backend/.env` (hoặc để trống nếu MySQL không có mật khẩu). Muốn khỏi cài MySQL: đổi `DB_ENGINE=sqlite` |
| `Unknown database 'student_db'` | Chưa làm Bước 4 — chạy `python sql/import_schema.py` |
| `Can't connect to MySQL server on '127.0.0.1'` | MySQL chưa bật: mở XAMPP/Laragon, hoặc `net start mysql` (Run as Administrator). Hoặc đổi `DB_ENGINE=sqlite` |
| `Could not import module "app.main"` | Đang đứng sai thư mục: `cd backend` rồi chạy lại |
| `ModuleNotFoundError: No module named 'fastapi'` | Chưa activate venv (thiếu chữ `(venv)`) hoặc chưa `pip install -r requirements.txt` |
| `[Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)` | Cổng 8000 đang bận: tắt server cũ (`Ctrl + C` ở terminal khác) hoặc chạy `--port 8080` |
| Đăng nhập xong lại quay về trang login | Đang mở qua Live Server / file trực tiếp → vào lại `http://localhost:8000/` |
| *"Bạn đã thử quá nhiều lần…"* (mã 429) | Nhập sai mật khẩu quá nhiều lần trong 5 phút. Đợi vài phút hoặc khởi động lại server |
| Ảnh đại diện là hình người màu xám | Bình thường — sinh viên chưa cập nhật ảnh thì dùng `uploads/default-avatar.png` |
| Trang trắng, `Ctrl + F5` vẫn trắng | Xem tab **Console** (F12) và terminal `uvicorn` để biết lỗi cụ thể |

Còn lỗi khác: xem chi tiết hơn trong [`docs/HUONG_DAN_CHAY.md`](docs/HUONG_DAN_CHAY.md).

## 2. Kiểm thử (chạy bộ test tự động)

```bash
cd backend
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pytest -v
```

Kết quả đúng: mọi dòng đều `PASSED`, dòng cuối giống `22 passed`.

- **Chạy ở chế độ nào cũng được** (`DB_ENGINE=sqlite` hoặc `mysql`) — cả 2 đều 22/22.
  Riêng SQLite: test tự dựng file `student.db` nếu chưa có.
- Nếu dùng MySQL, nên **nạp lại `schema.sql` (Bước 4)** trước khi chạy để có dữ liệu mẫu sạch.
  Chế độ SQLite thì chỉ cần `python sql/init_sqlite.py` để reset.
- Bộ test tự dọn dữ liệu tạm nó tạo ra và xử lý luôn yêu cầu `pending` còn sót từ lần thao tác tay trước đó,
  nên **chạy lại nhiều lần vẫn xanh**.
- Cảnh báo `StarletteDeprecationWarning: Using httpx ...` chỉ là deprecation, **có thể bỏ qua**.
- 2 kiểm tra so sánh chuỗi tiếng Việt (tìm không dấu, thứ tự sắp xếp) chỉ chạy khi `DB_ENGINE=mysql`,
  vì SQLite không có collation `utf8mb4_unicode_ci`.

## 3. Cấu trúc thư mục

```
Laptrinhweb(n8-n10)/
├── backend/
│   ├── app/            # toàn bộ mã nguồn Python (bên dưới)
│   ├── sql/schema.sql  # tạo DB student_db + dữ liệu mẫu
│   ├── tests/          # pytest (smoke test toàn bộ API)
│   ├── uploads/        # ảnh đại diện (chỉ commit default-avatar.png)
│   ├── .env / .env.example
│   └── requirements.txt
├── frontend/           # front-end (xem FRONTEND_GUIDE.md): index.html, pages/, css/, js/
└── docs/               # API.md, FRONTEND_GUIDE.md, HUONG_DAN_CHAY.md

backend/app/
├── main.py           # tạo FastAPI, session, lifespan, gắn router, mount frontend/ và uploads/
├── core/
│   ├── config.py     # đọc .env, chọn CSDL (DB_ENGINE=sqlite|mysql)
│   ├── deps.py       # ai gọi được endpoint nào: optional_user / login_required / admin_required / student_required
│   ├── errors.py     # mọi lỗi về dạng {error, field, code?}; lỗi validate 422 -> 400
│   ├── rate_limit.py # chống dò mật khẩu cho /api/login
│   └── security.py   # băm mật khẩu (bcrypt)
├── db/
│   ├── database.py   # engine + get_db; tự tạo bảng khi chạy SQLite
│   └── seed_data.py  # dữ liệu mẫu cho SQLite (trùng schema.sql)
├── models/           # SQLAlchemy, mỗi bảng một file (9 bảng)
├── schemas/          # hình dạng JSON vào/ra (khớp API.md)
├── routers/          # chỉ nhận request và trả JSON, giữ mỏng
└── services/         # NGHIỆP VỤ + giao dịch (tài liệu CSDL mục 4)
```

Hai chế độ CSDL:

| | `DB_ENGINE=sqlite` (mặc định trong `.env.example`) | `DB_ENGINE=mysql` |
|---|---|---|
| Cần cài | Không (chỉ Python) | MySQL 8 |
| Dữ liệu | File `backend/student.db`, tự tạo khi chạy server | `sql/schema.sql` |
| Tạo lại CSDL | `python sql/init_sqlite.py` | `python sql/import_schema.py` |
| Dùng khi | Demo, nộp bài, máy khác mở là chạy | Nộp/demo theo đúng yêu cầu MySQL |

## 4. Tiến độ (theo mốc trong API.md mục 8)

| Mốc | Endpoint | Trạng thái |
|---|---|---|
| 1 | `GET /api/majors`, `/api/classes`, `/api/students`, `/api/students/{id}` | **Xong**, có test |
| 2 | `POST /api/login`, `/api/logout`, `GET /api/me`, `POST /api/change-password` | **Xong**, có test (kèm rate-limit chống dò mật khẩu) |
| 2 | `GET /api/stats` | **Xong** (`routers/stats.py`) |
| 3 | `POST/PUT/DELETE /api/students` (kèm upload ảnh), `GET /api/skills` | **Xong**, có test |
| 4 | CRUD `classes`, `majors` | **Xong** (`routers/classes.py`) |
| 5 | `me/profile`, `me/update-requests`, `update-requests` (duyệt/từ chối) | **Xong** (`routers/me.py`, `requests.py`, `services/request_service.py`) |
| 6 | `GET /api/audit-logs` | **Xong** (`routers/audit.py`) |
| 7 | `GET /api/students/export` | **Xong** (xuất `.xlsx`; nút "Xuất Excel" ở trang Quản lý sinh viên) |

## 5. Cách viết thêm một endpoint

1. Đọc mục tương ứng trong `API.md` (đầu vào, đầu ra, lỗi).
2. Router chỉ nhận dữ liệu và gọi service; chọn quyền bằng dependency (`admin_required`...).
3. Nghiệp vụ nhiều bảng viết trong `services/`: **một giao dịch**, ghi `audit_service.write_log(...)` rồi `db.commit()` một lần ở cuối.
4. Báo lỗi bằng `raise ApiError(400, "Thông báo tiếng Việt", field="ten_truong")`, không tự dựng JSON lỗi.
5. Thêm test vào `tests/`.

## 6. Lưu ý

- **Không dùng `create_all()`** với MySQL. Bảng do `schema.sql` tạo. Đổi cấu trúc bảng thì sửa đồng thời `schema.sql`, `app/models/` (SQLite tạo bảng từ model nên phải khớp), và `API.md` nếu JSON đổi.
- `pending_flag` trong `profile_update_requests` là cột thường (không phải cột sinh tự động), do `services/request_service.py` gán 1 khi pending và NULL khi đã xử lý — để chạy được trên cả MySQL và SQLite.
- `students.updated_at` do `student_service` gán khi cập nhật (không dùng `ON UPDATE CURRENT_TIMESTAMP`).
- Đổi `SECRET_KEY` trong `.env`; không commit file `.env` và không commit `*.db`.
- Sinh viên chưa cập nhật ảnh sẽ dùng `uploads/default-avatar.png` (schema để `avatar_filename = NULL`); đừng trỏ tới file ảnh không tồn tại.
- Các tài liệu tham chiếu trong README nằm ở `docs/` (`API.md`, `FRONTEND_GUIDE.md`, `HUONG_DAN_CHAY.md`).
- Phân công Git: back-end chỉ sửa `backend/app/`, `backend/tests/`, `backend/sql/schema.sql`, `docs/API.md`; front-end chỉ sửa `frontend/`.

## 7. Reset dự án về trạng thái ban đầu

Dùng khi bạn đã thêm/sửa lung tung và muốn quay lại dữ liệu mẫu sạch.

**1) Tạo lại database + dữ liệu mẫu** (mất mọi dữ liệu đã nhập):

```bash
cd backend
python sql/init_sqlite.py            # nếu DB_ENGINE=sqlite
python sql/import_schema.py          # nếu DB_ENGINE=mysql (hoặc: mysql -u root -p < sql/schema.sql)
```

**2) Dọn ảnh đã upload** (giữ lại ảnh mặc định):

```powershell
# Windows PowerShell
Get-ChildItem uploads | Where-Object { $_.Name -ne 'default-avatar.png' } | Remove-Item
```

```bash
# macOS / Linux
find uploads -type f ! -name 'default-avatar.png' -delete
```

**3) Chạy lại server:**

```bash
uvicorn app.main:app --reload
```

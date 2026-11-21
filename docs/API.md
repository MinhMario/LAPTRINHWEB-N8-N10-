# API.md — Website Quản lý & Giới thiệu Hồ sơ Sinh viên

Tài liệu này là **nguồn duy nhất** để front-end và back-end thống nhất với nhau, viết theo
`Thiet_ke_CSDL_v2.docx` (9 bảng) và `schema.sql`.
Muốn đổi API: **sửa file này trước**, báo cả nhóm, rồi mới sửa code.

- Back-end: Python (FastAPI) + MySQL 8 — phụ trách: *(tên bạn)*
- Front-end: HTML/CSS/JS tĩnh, gọi API bằng `fetch` — phụ trách: *(tên 2 bạn)*
- Quy ước front-end: xem `FRONTEND_GUIDE.md`

**Tên trường JSON lấy theo tên cột CSDL** (`full_name`, `birth_date`, `student_code`...). Chỉ có vài trường *tính thêm* không phải cột CSDL, ví dụ `avatar_url`, `class_name`, `major_name`.

---

## 1. Chạy dự án

```bash
pip install -r requirements.txt
mysql -u root -p < schema.sql       # tạo DB student_db + dữ liệu mẫu
uvicorn app.main:app --reload       # chạy tại http://localhost:8000
```

- Giao diện: `http://localhost:8000/` (FastAPI phục vụ luôn thư mục `frontend/`).
- Ảnh: `http://localhost:8000/uploads/...`
- Thử API trực tiếp: `http://localhost:8000/docs`

```
project/
├── app/            # back-end (Python)
├── frontend/       # front-end (chi tiết: FRONTEND_GUIDE.md mục 2)
│   ├── index.html  detail.html  login.html  change-password.html
│   ├── student/    # profile.html, profile-edit.html
│   ├── admin/      # dashboard, manage, form, classes, requests, audit (.html)
│   └── assets/     # css/, js/, img/
├── uploads/        # ảnh đại diện (có sẵn default-avatar.png)
├── schema.sql
├── API.md
└── FRONTEND_GUIDE.md
```

> Front-end và API **cùng một địa chỉ** (`localhost:8000`) nên **không cần CORS** và cookie đăng nhập tự được gửi.
> **Không** mở file HTML bằng Live Server / double-click; luôn vào qua `http://localhost:8000`.

---

## 2. Vai trò, phân quyền và bản đồ trang

Có 3 đối tượng: **Khách** (chưa đăng nhập), **Sinh viên** (`role = student`), **Admin** (`role = admin`).

### 2.1 Bản đồ trang ↔ API

| Trang | Ai vào được | API sử dụng |
|---|---|---|
| `index.html` — danh sách dạng lưới | Mọi người | `GET /api/students`, `GET /api/classes`, `GET /api/majors` |
| `detail.html?id=X` — chi tiết 2 cột | Mọi người | `GET /api/students/{id}` |
| `login.html` | Khách | `POST /api/login` |
| `change-password.html` | Đã đăng nhập | `POST /api/change-password` |
| `student/profile.html` — hồ sơ của tôi + lịch sử yêu cầu | Sinh viên | `GET /api/me/profile`, `GET /api/me/update-requests` |
| `student/profile-edit.html` — gửi yêu cầu cập nhật | Sinh viên | `GET /api/me/profile`, `GET /api/skills`, `POST /api/me/update-requests` |
| `admin/dashboard.html` | Admin | `GET /api/stats` |
| `admin/manage.html` — bảng sinh viên | Admin | `GET /api/students`, `GET /api/classes`, `DELETE /api/students/{id}` |
| `admin/form.html` (thêm) / `admin/form.html?id=X` (sửa) | Admin | `GET /api/classes`, `GET /api/skills`, `GET /api/students/{id}`, `POST /api/students`, `PUT /api/students/{id}` |
| `admin/classes.html` — quản lý lớp **và ngành** | Admin | `GET/POST/PUT/DELETE /api/classes`, `GET/POST/PUT/DELETE /api/majors` |
| `admin/requests.html` — duyệt yêu cầu | Admin | `GET /api/update-requests`, `GET /api/update-requests/{id}`, `POST .../approve`, `POST .../reject` |
| `admin/audit.html` — nhật ký thao tác | Admin | `GET /api/audit-logs` |

Mọi trang (trừ `login.html`) gọi `GET /api/me` khi tải để biết ai đang đăng nhập (xem mục 6.1).

### 2.2 Bảng phân quyền endpoint

| Endpoint | Khách | Sinh viên | Admin |
|---|:--:|:--:|:--:|
| `GET /api/majors`, `/api/classes`, `/api/students`, `/api/students/{id}` | ✓ (một số trường bị ẩn, xem 3.6) | ✓ | ✓ |
| `POST /api/login`, `POST /api/logout` | ✓ | ✓ | ✓ |
| `GET /api/me`, `POST /api/change-password` | ✗ | ✓ | ✓ |
| `GET /api/skills` | ✗ | ✓ | ✓ |
| `GET /api/me/profile`, `GET/POST /api/me/update-requests` | ✗ | ✓ | ✗ (403) |
| Thêm/sửa/xóa sinh viên, lớp, ngành; `update-requests`, `audit-logs`, `stats`, `export` | ✗ | ✗ (403) | ✓ |

---

## 3. Quy ước chung

### 3.1 Định dạng dữ liệu
- Mọi response là **JSON** (trừ file ảnh và file xuất Excel). Tên trường `snake_case`.
- Ngày giờ: ISO 8601, ví dụ `"2026-11-15T10:30:00"`. Ngày sinh: `"2006-05-20"`. Front-end tự định dạng khi hiển thị.
- Trường tùy chọn không có giá trị → `null` (riêng `skills`, `social_links` trả mảng rỗng `[]`).

### 3.2 Mã HTTP

| Mã | Ý nghĩa |
|---|---|
| 200 / 201 | Thành công / Tạo mới thành công |
| 400 | Dữ liệu gửi lên sai (validate, trùng mã, file ảnh sai, vi phạm quy tắc nghiệp vụ) |
| 401 | Chưa đăng nhập, hoặc sai tên đăng nhập/mật khẩu |
| 403 | Đã đăng nhập nhưng **không đủ quyền**, hoặc tài khoản bị khóa, hoặc **phải đổi mật khẩu trước** |
| 404 | Không tìm thấy |
| 500 | Lỗi server |

### 3.3 Định dạng lỗi (luôn như sau)

```json
{ "error": "Mã sinh viên đã tồn tại", "field": "student_code" }
```

- `error`: thông báo tiếng Việt **do back-end viết**, front-end chỉ hiển thị.
- `field`: tên trường bị lỗi (hiện ngay dưới ô nhập). `null` → hiện thông báo chung. Với trường lồng nhau dùng đường dẫn, ví dụ `"skills[1].level"`, `"social_links[0].url"`.
- `code` (**tùy chọn**, chỉ có ở vài lỗi đặc biệt, front-end dùng để xử lý riêng):

| `code` | Khi nào | Front-end làm gì |
|---|---|---|
| `MUST_CHANGE_PASSWORD` | 403, tài khoản còn `must_change_password = 1` mà gọi API khác ngoài `me`, `logout`, `change-password` | Chuyển tới `/change-password.html` |
| `ACCOUNT_LOCKED` | 403 khi đăng nhập vào tài khoản bị khóa | Hiện `error` ở trang login |

### 3.4 Xác thực
- Cookie session, tạo bởi `POST /api/login`. Trình duyệt tự gửi cookie (cùng origin).
- Chưa đăng nhập mà gọi endpoint cần đăng nhập → **401** `{"error": "Bạn chưa đăng nhập", "field": null}`.
- Đăng nhập nhưng sai vai trò → **403** `{"error": "Bạn không có quyền thực hiện thao tác này", "field": null}`.

### 3.5 Phân trang (mọi endpoint danh sách có phân trang)

Tham số: `page` (mặc định 1), `page_size` (mặc định theo từng endpoint, tối đa 50). Kết quả:

```json
{ "items": [ ... ], "page": 1, "page_size": 12, "total": 25, "total_pages": 3 }
```

Không có kết quả → `items: []`, `total: 0`, `total_pages: 0`.

### 3.6 Dữ liệu cá nhân bị ẩn

Hồ sơ hiển thị công khai nên các trường nhạy cảm **chỉ trả giá trị cho admin và cho chính sinh viên đó**.
Với người khác (khách, hoặc sinh viên xem hồ sơ bạn học) các trường sau trả `null`:
`email`, `phone`, `address`, `birth_date`. Front-end hiển thị "—" hoặc ẩn dòng đó.

### 3.7 Ảnh đại diện
- Trong JSON, ảnh là `avatar_url`: **đường dẫn đầy đủ** ví dụ `"/uploads/9f3a1c7e.jpg"`, dùng thẳng cho `<img src>`. Chưa có ảnh → `"/uploads/default-avatar.png"` (không bao giờ `null`). (CSDL chỉ lưu tên file trong cột `avatar_filename`, API tự ghép tiền tố.)
- Khi upload, file nằm ở trường FormData tên **`avatar`**. Cho phép **jpg, png, webp**, tối đa **2MB**; sai → 400, `field: "avatar"`.
- Back-end đổi tên file ngẫu nhiên, không cắt/thu nhỏ ảnh → front-end dùng khung vuông + CSS `object-fit: cover`.
- Xem trước ảnh trước khi upload do front-end làm (`URL.createObjectURL`).

---

## 4. Các đối tượng dữ liệu

### 4.1 Sinh viên — đầy đủ (chi tiết, form sửa, kết quả thêm/sửa)

```json
{
  "id": 1,
  "student_code": "B24DTCN001",
  "full_name": "Nguyễn Văn An",
  "gender": "Nam",
  "birth_date": "2006-05-20",
  "email": "b24dtcn001@stu.ptit.edu.vn",
  "phone": "0912345678",
  "address": "Hà Đông, Hà Nội",
  "hobbies": "Đọc sách, chơi cờ vua",
  "avatar_url": "/uploads/sample-01.jpg",
  "class_id": 1,
  "class_code": "D24CNTT01",
  "class_name": "Công nghệ thông tin 1",
  "major_id": 1,
  "major_code": "CNTT",
  "major_name": "Công nghệ thông tin",
  "skills": [ { "id": 1, "name": "Python", "level": 4 }, { "id": 2, "name": "SQL", "level": 3 } ],
  "social_links": [ { "platform": "GitHub", "url": "https://github.com/b24dtcn001" } ],
  "created_at": "2026-10-02T08:01:00",
  "updated_at": null
}
```

- `skills` sắp theo `level` giảm dần rồi theo tên; `social_links` sắp theo `platform`.
- `updated_at` là `null` nếu hồ sơ chưa từng được sửa.
- `email`, `phone`, `address`, `birth_date` có thể là `null` do bị ẩn (mục 3.6).

### 4.2 Sinh viên — rút gọn (trong danh sách)

```json
{
  "id": 1,
  "student_code": "B24DTCN001",
  "full_name": "Nguyễn Văn An",
  "gender": "Nam",
  "email": null,
  "avatar_url": "/uploads/sample-01.jpg",
  "class_id": 1,
  "class_code": "D24CNTT01",
  "class_name": "Công nghệ thông tin 1",
  "major_id": 1,
  "major_name": "Công nghệ thông tin"
}
```
(`email` chỉ có giá trị khi người gọi là admin.)

### 4.3 Lớp và Ngành

```json
{ "id": 1, "code": "D24CNTT01", "name": "Công nghệ thông tin 1", "major_id": 1, "major_name": "Công nghệ thông tin", "student_count": 5 }
```
```json
{ "id": 1, "code": "CNTT", "name": "Công nghệ thông tin", "class_count": 2 }
```

### 4.4 Yêu cầu cập nhật hồ sơ

`new_data` chỉ chứa các khóa sinh viên muốn sửa (xem 5.2):

```json
{
  "id": 1,
  "status": "pending",
  "new_data": {
    "phone": "0987654321",
    "hobbies": "Vẽ, đọc truyện",
    "skills": [ { "name": "Python", "level": 4 } ],
    "social_links": [ { "platform": "GitHub", "url": "https://github.com/abc" } ]
  },
  "reject_reason": null,
  "created_at": "2026-11-14T09:00:00",
  "reviewed_at": null
}
```
`status`: `pending` (chờ duyệt) | `approved` (đã duyệt) | `rejected` (bị từ chối, có `reject_reason`).

---

## 5. Quy tắc dữ liệu (front-end validate sớm, back-end luôn kiểm tra lại)

### 5.1 Sinh viên

| Trường | Bắt buộc | Quy tắc |
|---|---|---|
| `student_code` | Có | Duy nhất. Regex `^[A-Z]\d{2}[A-Z]{4}\d{3}$`, ví dụ `B24DTCN001`. Back-end tự viết hoa |
| `full_name` | Có | Tối đa 100 ký tự |
| `gender` | Có | Đúng một trong: `Nam`, `Nữ`, `Khác` |
| `birth_date` | Có | `YYYY-MM-DD`, không ở tương lai |
| `email` | Có | Đúng định dạng email, **duy nhất**, tối đa 100 ký tự |
| `phone` | Có | 10 chữ số, bắt đầu bằng 0 |
| `address` | Không | Tối đa 255 ký tự |
| `hobbies` | Không | Văn bản tự do |
| `class_id` | Có | Phải là `id` có trong `GET /api/classes` |
| `skills` | Không | Mảng `[{ "name": "Python", "level": 4 }]`. `name` tối đa 50 ký tự; `level` từ 1 đến 5 (mặc định 3); không trùng tên (không phân biệt hoa thường). Tên chưa có thì back-end tự thêm vào danh mục kỹ năng |
| `social_links` | Không | Mảng `[{ "platform": "GitHub", "url": "https://..." }]`. `platform` tối đa 30 ký tự, **mỗi nền tảng chỉ một liên kết**; `url` bắt đầu bằng `http://` hoặc `https://`, tối đa 255 ký tự |
| `avatar` | Không | Xem mục 3.7 |

### 5.2 Yêu cầu cập nhật hồ sơ (sinh viên)
- Chỉ được gửi các khóa: `phone`, `address`, `hobbies`, `skills`, `social_links` (quy tắc từng khóa như bảng 5.1; `phone` không được để trống).
- Khóa nào khác (`student_code`, `full_name`, `birth_date`, `gender`, `email`, `class_id`, ảnh) → 400, `field` = tên khóa đó, `error`: "Trường này chỉ admin được sửa".
- Phải có **ít nhất một khóa**. `address` hoặc `hobbies` = `""` nghĩa là xóa giá trị. `skills` hoặc `social_links` = `[]` nghĩa là xóa toàn bộ danh sách; khóa không gửi thì giữ nguyên.
- Mỗi sinh viên chỉ có **một yêu cầu `pending`** cùng lúc. Gửi thêm → 400 "Bạn đang có yêu cầu chờ duyệt".
- Ảnh đại diện **không** đổi qua yêu cầu.

### 5.3 Lớp và Ngành

| Đối tượng | Trường | Quy tắc |
|---|---|---|
| Lớp | `code` | Bắt buộc, duy nhất, tối đa 20 ký tự |
| Lớp | `name` | Bắt buộc, tối đa 100 ký tự |
| Lớp | `major_id` | Bắt buộc, phải có trong `GET /api/majors` |
| Ngành | `code` | Bắt buộc, duy nhất, tối đa 10 ký tự |
| Ngành | `name` | Bắt buộc, duy nhất, tối đa 100 ký tự |

### 5.4 Mật khẩu
Mật khẩu mới: tối thiểu **8 ký tự** và khác mật khẩu hiện tại.

---

## 6. Chi tiết các endpoint

### 6.1 Xác thực

#### `POST /api/login`
- Body JSON: `{ "username": "admin", "password": "123456" }`
- 200 (kèm cookie session):
```json
{ "ok": true, "username": "B24DTCN002", "role": "student", "must_change_password": true }
```
- Sau khi đăng nhập, front-end chuyển trang theo thứ tự: `must_change_password = true` → `/change-password.html`; `role = admin` → `/admin/dashboard.html`; `role = student` → `/student/profile.html`.
- 401: `{ "error": "Sai tên đăng nhập hoặc mật khẩu", "field": null }`
- 403: `{ "error": "Tài khoản đã bị khóa", "field": null, "code": "ACCOUNT_LOCKED" }`
- Trang login chỉ hiện lỗi, không chuyển hướng khi lỗi.

#### `POST /api/logout`
- Gọi lúc nào cũng trả 200: `{ "ok": true }`. Sau đó chuyển về `/login.html`.

#### `GET /api/me`
- Cần đăng nhập. 200:
```json
{ "username": "B24DTCN002", "role": "student", "must_change_password": false, "student_id": 2 }
```
`student_id` là `null` với admin. Chưa đăng nhập → 401.
- Trang **công khai** (`index`, `detail`) gọi endpoint này để đổi menu (đã đăng nhập hay chưa); nhận 401 thì coi là khách, **không** chuyển hướng.
- Trang cần đăng nhập: nhận 401 → về `/login.html`.

#### `POST /api/change-password`
- Cần đăng nhập. Body JSON: `{ "current_password": "...", "new_password": "..." }`
- 200: `{ "ok": true }` (đồng thời tắt `must_change_password`). Sau đó chuyển tới trang chính theo vai trò.
- 400: `{ "error": "Mật khẩu hiện tại không đúng", "field": "current_password" }` hoặc `{ "error": "Mật khẩu mới phải có ít nhất 8 ký tự", "field": "new_password" }`.

---

### 6.2 Dữ liệu công khai

#### `GET /api/majors` → mảng ngành (4.3)
#### `GET /api/classes?major_id=` → mảng lớp (4.3). `major_id` tùy chọn để lọc lớp theo ngành.

#### `GET /api/students` — danh sách + tìm kiếm + lọc + sắp xếp + phân trang

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `q` | rỗng | Tìm theo **họ tên hoặc mã SV** (chứa chuỗi, không phân biệt hoa thường và dấu) |
| `class_id` | rỗng | Lọc theo lớp |
| `major_id` | rỗng | Lọc theo ngành |
| `sort` | `newest` | `newest` (mới tạo trước) · `name` (A→Z theo họ tên) · `class` (theo mã lớp rồi tên) |
| `page`, `page_size` | 1, 12 | Phân trang (tối đa 50) |

Ví dụ: `GET /api/students?q=an&major_id=1&sort=name&page=1`

200: `{ "items": [ <sinh viên rút gọn 4.2> ], "page": 1, "page_size": 12, "total": 25, "total_pages": 3 }`

> Front-end: đổi ô tìm hoặc bộ lọc thì đặt lại `page = 1`; chờ ~300ms sau khi ngừng gõ rồi mới gọi API.

#### `GET /api/students/{id}` — chi tiết
- 200: sinh viên đầy đủ (4.1). 404: `{ "error": "Không tìm thấy sinh viên", "field": null }`.

---

### 6.3 Sinh viên (role `student`)

#### `GET /api/me/profile`
- 200: hồ sơ **đầy đủ, không bị ẩn** của chính mình (4.1). Admin gọi → 403.

#### `GET /api/me/update-requests`
- 200: mảng yêu cầu của mình, mới nhất trước (4.4).

#### `POST /api/me/update-requests` — gửi yêu cầu cập nhật hồ sơ
- Body **JSON**, chỉ chứa các khóa muốn sửa (quy tắc mục 5.2):
```json
{ "phone": "0987654321", "skills": [ { "name": "Python", "level": 4 } ] }
```
- 201: đối tượng yêu cầu (4.4) với `status = "pending"`.
- 400 ví dụ:
```json
{ "error": "Bạn đang có yêu cầu chờ duyệt", "field": null }
{ "error": "Số điện thoại phải gồm 10 chữ số", "field": "phone" }
{ "error": "Trường này chỉ admin được sửa", "field": "email" }
{ "error": "Mức kỹ năng phải từ 1 đến 5", "field": "skills[0].level" }
```

---

### 6.4 Admin — sinh viên

#### `POST /api/students` — thêm
- Body **FormData** (`multipart/form-data`). Tên input trùng tên trường ở 5.1.
  `skills` và `social_links` gửi dưới dạng **chuỗi JSON**: `fd.append("skills", JSON.stringify([...]))`.
  Có thể kèm file `avatar`.
- Back-end tự tạo luôn tài khoản đăng nhập cho sinh viên (username = `student_code`, mật khẩu mặc định theo cấu hình, bắt đổi mật khẩu ở lần đầu).
- 201: sinh viên đầy đủ (4.1).
- 400 ví dụ: `{ "error": "Mã sinh viên đã tồn tại", "field": "student_code" }`, `{ "error": "Email đã được sử dụng", "field": "email" }`, `{ "error": "Ảnh chỉ chấp nhận jpg, png, webp và tối đa 2MB", "field": "avatar" }`.

#### `PUT /api/students/{id}` — sửa
- Body **FormData**, gửi đủ các trường của form như lúc thêm.
  - Trường tùy chọn (`address`, `hobbies`) gửi `""` → xóa giá trị.
  - `skills` / `social_links`: **có gửi** khóa → thay toàn bộ danh sách (`"[]"` = xóa hết); **không gửi** khóa → giữ nguyên.
  - Không chọn ảnh mới → **không gửi** `avatar` (giữ ảnh cũ). Muốn về ảnh mặc định → gửi `remove_avatar=1`.
  - Đổi `student_code` thì tên đăng nhập của sinh viên đổi theo.
- 200: sinh viên đầy đủ sau khi sửa. Lỗi: 400 (validate), 404.

#### `DELETE /api/students/{id}` — xóa
- Xóa hồ sơ cùng kỹ năng, mạng xã hội; tài khoản của sinh viên bị khóa. **Front-end phải có hộp thoại xác nhận** trước khi gọi.
- 200: `{ "ok": true }`. 404 nếu không có.

#### `GET /api/students/export` *(tùy chọn, làm sau)*
- Nhận cùng tham số `q`, `class_id`, `major_id`, `sort` như danh sách. Trả file `.xlsx`.

#### `GET /api/skills?q=` — gợi ý kỹ năng khi nhập (sinh viên và admin)
- 200: `[ { "id": 1, "name": "Python" } ]` (tối đa 20 kết quả, tìm theo tên chứa `q`).

---

### 6.5 Admin — lớp và ngành

#### Lớp
- `POST /api/classes` — body JSON `{ "code": "D24CNTT03", "name": "Công nghệ thông tin 3", "major_id": 1 }` → 201 đối tượng lớp (4.3).
- `PUT /api/classes/{id}` — cùng body → 200.
- `DELETE /api/classes/{id}` → 200 `{ "ok": true }`. Lớp còn sinh viên → 400 `{ "error": "Không thể xóa lớp đang có sinh viên", "field": null }`.

#### Ngành
- `POST /api/majors` — body JSON `{ "code": "KHMT", "name": "Khoa học máy tính" }` → 201.
- `PUT /api/majors/{id}` → 200.
- `DELETE /api/majors/{id}` → 200. Ngành còn lớp → 400 `{ "error": "Không thể xóa ngành đang có lớp", "field": null }`.

Trùng `code`/`name` → 400 kèm `field` tương ứng.

---

### 6.6 Admin — duyệt yêu cầu cập nhật

#### `GET /api/update-requests?status=pending&page=1&page_size=10`
- `status`: `pending` (mặc định) | `approved` | `rejected` | `all`.
- 200: phân trang, mỗi phần tử:
```json
{ "id": 1, "status": "pending", "student_id": 2, "student_code": "B24DTCN002", "full_name": "Trần Thị Bình", "created_at": "2026-11-14T09:00:00", "reviewed_at": null }
```

#### `GET /api/update-requests/{id}` — chi tiết để so sánh
```json
{
  "id": 1,
  "status": "pending",
  "student": { "id": 2, "student_code": "B24DTCN002", "full_name": "Trần Thị Bình", "avatar_url": "/uploads/default-avatar.png" },
  "new_data": { "phone": "0987654321", "skills": [ { "name": "Python", "level": 4 } ] },
  "current":  { "phone": "0912345678", "skills": [ { "name": "SQL", "level": 3 } ] },
  "reject_reason": null,
  "reviewed_by": null,
  "created_at": "2026-11-14T09:00:00",
  "reviewed_at": null
}
```
`current` chứa **giá trị hiện tại của đúng các khóa có trong `new_data`**, để hiển thị bảng "Hiện tại → Đề nghị".

#### `POST /api/update-requests/{id}/approve`
- Không có body. 200: `{ "ok": true }`. Hồ sơ được cập nhật theo `new_data`.
- 400: `{ "error": "Yêu cầu này đã được xử lý", "field": null }` hoặc lỗi dữ liệu không còn hợp lệ (yêu cầu vẫn ở trạng thái chờ duyệt).

#### `POST /api/update-requests/{id}/reject`
- Body JSON: `{ "reject_reason": "Số điện thoại phải gồm 10 chữ số" }` (bắt buộc, tối đa 255 ký tự).
- 200: `{ "ok": true }`. 400 `{ "error": "Vui lòng nhập lý do từ chối", "field": "reject_reason" }`.

---

### 6.7 Admin — nhật ký và thống kê

#### `GET /api/audit-logs`

| Tham số | Ý nghĩa |
|---|---|
| `target_type` | `student` \| `class` \| `major` |
| `target_id` | Mã bản ghi; dùng cùng `target_type` để xem lịch sử một hồ sơ |
| `action` | `create` \| `update` \| `delete` \| `approve` \| `reject` |
| `page`, `page_size` | Mặc định 1, 20 |

Mới nhất trước. Mỗi phần tử:
```json
{
  "id": 4,
  "username": "admin",
  "action": "delete",
  "target_type": "student",
  "target_id": 99,
  "old_data": { "student_code": "B24DTCN099", "full_name": "Nguyễn Văn Z", "class": "D24CNTT01", "skills": [ { "name": "Python", "level": 3 } ], "social_links": [] },
  "new_data": null,
  "created_at": "2026-11-12T16:20:00"
}
```
`old_data` / `new_data` là JSON tự do, front-end hiển thị dạng danh sách "trường: giá trị"; `null` nếu không có.

Quy ước back-end ghi nhật ký (để front-end hiểu dữ liệu): `create` → có `new_data`; `update` → có `old_data` và `new_data`; `delete` → luôn có `old_data` đầy đủ; `approve` → `old_data`, `new_data` của các trường được sửa; `reject` → `new_data = { "reject_reason": "..." }`. Duyệt/từ chối đều dùng `target_type = "student"`.

#### `GET /api/stats`
```json
{
  "total_students": 25,
  "total_classes": 5,
  "total_majors": 4,
  "pending_requests": 1,
  "by_class": [ { "class_code": "D24CNTT01", "class_name": "Công nghệ thông tin 1", "count": 5 } ],
  "recent": [ { "id": 25, "student_code": "B24DTCN025", "full_name": "Châu Văn Tài", "avatar_url": "/uploads/sample-25.jpg" } ]
}
```
`by_class` dùng vẽ biểu đồ (ví dụ Chart.js: nhãn = `class_code`, giá trị = `count`). `recent` là 5 hồ sơ mới nhất. `pending_requests` dùng để hiện số trên menu "Duyệt yêu cầu".

---

## 7. Dữ liệu mẫu (trong `schema.sql`)

| Tài khoản | Mật khẩu | Ghi chú |
|---|---|---|
| `admin` | `123456` | Admin |
| `B24DTCN001` | `Ptit@2026` | Sinh viên, **không** bị buộc đổi mật khẩu → thử giao diện sinh viên ngay |
| `B24DTCN002` … `B24DTCN025` | `Ptit@2026` | Sinh viên, **bị buộc đổi mật khẩu** ở lần đăng nhập đầu → thử luồng `change-password` |

- 4 ngành, 5 lớp, 25 sinh viên, 10 kỹ năng.
- 3 yêu cầu cập nhật: sinh viên `B24DTCN002` (chờ duyệt), `B24DTCN003` (bị từ chối, có lý do), `B24DTCN004` (đã duyệt).
- 4 dòng nhật ký mẫu.
- Các ca đặc biệt để thử giao diện:
  - Tên rất dài: `B24DTCN021`
  - Không có ảnh: `B24DTCN002`, `009`, `017`, `023`
  - Không có kỹ năng: `B24DTCN005`, `012`, `020`
  - Nhiều kỹ năng (8): `B24DTCN003`
  - Không có mạng xã hội: `B24DTCN006`, `012`, `018`, `024`
  - Không có địa chỉ: một số hồ sơ
- Ảnh `sample-XX.jpg` chưa có file thật: bỏ vài ảnh bất kỳ vào `uploads/` (đặt đúng tên như trong DB), hoặc để trống thì ảnh lỗi và front-end tự thay bằng `default-avatar.png`.

---

## 8. Mốc bàn giao (dự kiến, chỉnh theo lịch nhóm)

| Mốc | Back-end giao | Front-end làm được |
|---|---|---|
| 0 | `API.md`, `schema.sql` | Dựng khung HTML/CSS, dùng JSON mẫu viết tay |
| 1 | `GET majors`, `classes`, `students`, `students/{id}` | `index.html`, `detail.html` |
| 2 | `login`, `logout`, `me`, `change-password`, `stats` | `login.html`, `change-password.html`, `admin/dashboard.html` |
| 3 | `POST/PUT/DELETE /api/students` (kèm upload ảnh), `GET /api/skills` | `admin/manage.html`, `admin/form.html` |
| 4 | CRUD `classes` và `majors` | `admin/classes.html` |
| 5 | `me/profile`, `me/update-requests`, `update-requests` (duyệt/từ chối) | `student/profile.html`, `student/profile-edit.html`, `admin/requests.html` |
| 6 | `audit-logs` | `admin/audit.html` |
| 7 | *(Tùy chọn)* `students/export` | Nút "Xuất Excel" |

---

## 9. Báo lỗi API

Khi gặp lỗi, front-end gửi cho back-end đủ 3 thứ: **URL + method**, **dữ liệu đã gửi**, **phản hồi nhận được** (chụp tab *Network* của DevTools).

## Lịch sử thay đổi

| Ngày | Thay đổi | Người sửa |
|---|---|---|
| 15/11/2026 | Bản v2: theo CSDL 9 bảng (thêm vai trò sinh viên, ngành, kỹ năng, mạng xã hội, yêu cầu cập nhật, nhật ký, đổi mật khẩu); đổi tên trường theo CSDL | |
| 16/11/2026 | Đổi đường dẫn trang theo cấu trúc thư mục mới (`student/`, `admin/`, `assets/`); không đổi endpoint nào | |

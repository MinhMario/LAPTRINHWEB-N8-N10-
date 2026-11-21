# FRONTEND_GUIDE.md — Quy ước chung cho Front-end

Đọc cùng với `API.md` (hợp đồng với back-end) và `schema.sql` (dữ liệu mẫu).
Mục tiêu: hai bạn front-end viết **đồng nhất** với nhau, và code **khớp ngay** với back-end để ghép không phải sửa lại.

Nguyên tắc chung: **tên trong HTML = tên trường trong API.** Không tự đặt tên khác.

---

## 1. Phân công trang và file dùng chung

Có 12 trang, chia theo nhóm người dùng (thư mục trang cũng chia theo vai trò):

| Người | Trang | File JS riêng (`assets/js/pages/...`) | CSS riêng (`assets/css/pages/...`) |
|---|---|---|---|
| Bạn A *(điền tên)* — phía người dùng | `index.html`, `detail.html`, `login.html`, `change-password.html`, `student/profile.html`, `student/profile-edit.html` | `index.js`, `detail.js`, `login.js`, `change-password.js`, `student/profile.js`, `student/profile-edit.js` | `public.css`, `student.css` |
| Bạn B *(điền tên)* — phía admin | `admin/dashboard.html`, `admin/manage.html`, `admin/form.html`, `admin/classes.html`, `admin/requests.html`, `admin/audit.html` | `admin/dashboard.js`, `admin/manage.js`, `admin/form.js`, `admin/classes.js`, `admin/requests.js`, `admin/audit.js` | `admin.css` |

**File dùng chung** — mỗi nhóm file chỉ **một người giữ** (ghi tên bên dưới), người kia chỉ dùng; muốn sửa thì báo người giữ:

| File | Người giữ | Nội dung |
|---|---|---|
| `assets/css/base.css` | *(điền tên)* | Reset, biến màu/font/khoảng cách |
| `assets/css/components.css` | *(điền tên)* | Nút, card, bảng, form, nhãn trạng thái, modal |
| `assets/css/layout.css` | *(điền tên)* | Header, menu, footer, lưới, responsive |
| `assets/js/core/api.js`, `core/auth.js` | *(điền tên)* | Hàm `api()`; `getMe()`, `requireLogin()` |
| `assets/js/utils/format.js` | *(điền tên)* | `formatDate()`, `escapeHtml()` |
| `assets/js/components/*.js` | *(điền tên)* | `nav.js`, `form-errors.js`, `pagination.js`, `notify.js`, `dynamic-rows.js` |

`components/dynamic-rows.js` (hàng nhập kỹ năng và mạng xã hội) dùng ở cả `admin/form.html` và `student/profile-edit.html`, nên thuộc nhóm file chung, không thuộc riêng ai.

---

## 2. Cấu trúc thư mục

```
frontend/
├── index.html                  # danh sách sinh viên (ở gốc để mở "/" là thấy)
├── detail.html
├── login.html
├── change-password.html
│
├── student/                    # trang của sinh viên
│   ├── profile.html
│   └── profile-edit.html
│
├── admin/                      # trang của admin
│   ├── dashboard.html
│   ├── manage.html
│   ├── form.html
│   ├── classes.html
│   ├── requests.html
│   └── audit.html
│
└── assets/
    ├── css/
    │   ├── base.css            # reset, biến màu/font/khoảng cách
    │   ├── components.css      # nút, card, bảng, form, badge, modal
    │   ├── layout.css          # header, menu, footer, lưới, responsive
    │   └── pages/
    │       ├── public.css      # index, detail, login, change-password
    │       ├── student.css
    │       └── admin.css
    ├── js/
    │   ├── core/
    │   │   ├── api.js          # hàm api()
    │   │   └── auth.js         # getMe(), requireLogin()
    │   ├── utils/
    │   │   └── format.js       # formatDate(), escapeHtml()
    │   ├── components/         # thành phần dùng lại nhiều trang
    │   │   ├── nav.js          # menu theo vai trò
    │   │   ├── form-errors.js  # hiện/xóa lỗi theo field
    │   │   ├── pagination.js
    │   │   ├── notify.js       # thông báo thành công/lỗi
    │   │   └── dynamic-rows.js # hàng nhập kỹ năng và mạng xã hội
    │   └── pages/              # mỗi trang một file, trùng tên trang
    │       ├── index.js  detail.js  login.js  change-password.js
    │       ├── student/        profile.js  profile-edit.js
    │       └── admin/          dashboard.js  manage.js  form.js  classes.js  requests.js  audit.js
    └── img/                    # logo, icon (ảnh sinh viên KHÔNG để ở đây, nằm trong /uploads/)
```

- Tên file và thư mục: chữ thường, không dấu, không khoảng trắng; nhiều từ nối bằng dấu gạch (`change-password.html`).
- Mỗi trang có đúng một file JS riêng trong `assets/js/pages/`, đường dẫn con **trùng** với đường dẫn trang (`admin/manage.html` ↔ `pages/admin/manage.js`).
- **Không viết JS trực tiếp trong HTML** (`onclick="..."`, `<script>` dài). Gắn sự kiện bằng `addEventListener` trong file JS.
- Dùng thẻ `<script>` thường, **không** dùng `import/export`; các hàm dùng chung là hàm toàn cục, nên **thứ tự nạp quan trọng** (mục 3.1).
- Không cần thư mục `lib/`: Chart.js nạp bằng thẻ `<script>` từ CDN. Nếu cần chạy khi không có mạng thì tải về đặt vào `assets/lib/`.

---

## 3. Chạy và gọi API

- Luôn mở qua `http://localhost:8000`. **Không** dùng Live Server hay mở file trực tiếp, vì lệch origin và mất cookie đăng nhập.
- **Mọi đường dẫn viết tuyệt đối từ gốc**, vì trang nằm ở nhiều cấp thư mục: `/api/students`, `/assets/js/core/api.js`, `/admin/manage.html`, `/login.html`. Viết tương đối (`login.html`) sẽ sai khi đang ở trong `admin/`. Áp dụng cho `<link>`, `<script>`, `<a href>`, `<img src>` và `location.href`.
- **Mọi lời gọi API đi qua hàm `api()`** trong `assets/js/core/api.js`, không tự gọi `fetch` rải rác.
- Tham số trên URL của trang: `/detail.html?id=3`, `/admin/form.html?id=3` (sửa), `/admin/form.html` (thêm).

### 3.1 Thứ tự nạp trong mỗi trang

Nạp CSS rồi JS theo thứ tự: chung → riêng của trang. Ví dụ `admin/manage.html`:

```html
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/layout.css">
<link rel="stylesheet" href="/assets/css/pages/admin.css">

<!-- cuối <body> -->
<script src="/assets/js/core/api.js"></script>
<script src="/assets/js/core/auth.js"></script>
<script src="/assets/js/utils/format.js"></script>
<script src="/assets/js/components/nav.js"></script>
<script src="/assets/js/components/form-errors.js"></script>
<script src="/assets/js/components/pagination.js"></script>
<script src="/assets/js/components/notify.js"></script>
<script src="/assets/js/pages/admin/manage.js"></script>
```

Thứ tự JS: `core/` → `utils/` → các `components/` trang đó cần → `pages/<trang>.js` (luôn cuối cùng). Chỉ nạp `components/` thật sự dùng.

### 3.2 Hàm `api()` dùng chung (`assets/js/core/api.js`)

```javascript
async function api(url, options = {}) {
  const { noRedirect, ...fetchOptions } = options;
  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch {
    throw { error: "Không thể kết nối máy chủ, vui lòng thử lại", field: null };
  }

  let data = null;
  try { data = await res.json(); } catch { /* file hoặc nội dung rỗng */ }

  if (res.status === 401 && !noRedirect) {
    location.href = "/login.html";
    throw data;
  }
  if (res.status === 403 && data && data.code === "MUST_CHANGE_PASSWORD") {
    if (!location.pathname.endsWith("/change-password.html")) location.href = "/change-password.html";
    throw data;
  }
  if (!res.ok) throw data || { error: "Có lỗi xảy ra", field: null };
  return data;
}
```

### 3.3 Kiểm tra đăng nhập và vai trò (`assets/js/core/auth.js`)

```javascript
// Trang công khai: lấy thông tin người dùng nếu có, không bắt buộc đăng nhập
async function getMe() {
  try { return await api("/api/me", { noRedirect: true }); }
  catch { return null; }                     // null = khách
}

// Trang cần đăng nhập: gọi ĐẦU TIÊN khi tải trang
async function requireLogin(role) {          // role: "admin" | "student" | undefined
  const me = await getMe();
  if (!me) { location.href = "/login.html"; return null; }
  const onChangePage = location.pathname.endsWith("/change-password.html");
  if (me.must_change_password && !onChangePage) { location.href = "/change-password.html"; return null; }
  if (role && me.role !== role) {
    location.href = me.role === "admin" ? "/admin/dashboard.html" : "/student/profile.html";
    return null;
  }
  return me;
}
```

Quy tắc đăng nhập và chuyển trang:

| Trang | Gọi |
|---|---|
| `index.html`, `detail.html` | `getMe()` (khách vẫn xem được; dùng kết quả để đổi menu) |
| `change-password.html` | `requireLogin()` |
| `student/profile.html`, `student/profile-edit.html` | `requireLogin("student")` |
| `admin/*` (cả 6 trang) | `requireLogin("admin")` |

Sau khi đăng nhập thành công, chuyển theo thứ tự: `must_change_password` → `/change-password.html`; `role = admin` → `/admin/dashboard.html`; `role = student` → `/student/profile.html`. Nút "Đăng xuất": `POST /api/logout` rồi về `/login.html`.

Menu (`components/nav.js`) hiển thị theo vai trò: khách → Trang chủ, Đăng nhập; sinh viên → Trang chủ, Hồ sơ của tôi, Đổi mật khẩu, Đăng xuất; admin → Dashboard, Sinh viên, Lớp & ngành, Duyệt yêu cầu (kèm số `pending_requests`), Nhật ký, Đăng xuất.

> Các file HTML là file tĩnh nên ai cũng tải được kể cả trang admin; điều này không sao vì dữ liệu nằm sau API đã chặn quyền. Chưa đăng nhập mà mở trang admin thì `requireLogin("admin")` chuyển về `/login.html`.

---

## 4. Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Tên trường dữ liệu | `snake_case`, trùng API | `student_code`, `full_name`, `birth_date` |
| Class CSS | `kebab-case` | `.student-card`, `.btn-primary` |
| `id` phần tử | `kebab-case`, mô tả rõ | `#student-grid`, `#search-input` |
| Biến/hàm JS | `camelCase` | `loadStudents()`, `currentPage` |
| Hằng số | `UPPER_SNAKE_CASE` | `PAGE_SIZE` |

`id` cố định ở những chỗ chung:

| Phần tử | `id` |
|---|---|
| Vùng chứa card (User) | `#student-grid` |
| Thân bảng (Admin) | `#student-table-body` |
| Ô tìm kiếm | `#search-input` |
| Dropdown lọc ngành / lớp | `#major-filter`, `#class-filter` |
| Dropdown sắp xếp | `#sort-select` |
| Vùng phân trang | `#pagination` |
| Thông báo trạng thái/rỗng | `#status-message` |
| Form chính của trang | `#student-form` (`admin/form.html`), `#request-form` (`student/profile-edit.html`), `#login-form`, `#password-form` |
| Lỗi chung của form | `#form-error` |

---

## 5. Form sinh viên (admin) — `admin/form.html`

Thuộc tính `name` của input **phải trùng tên trường API**. Back-end đọc theo đúng các tên này.

| `name` | Loại input | Ghi chú |
|---|---|---|
| `student_code` | text | Bắt buộc |
| `full_name` | text | Bắt buộc |
| `gender` | `<select>` | Bắt buộc; `value` chỉ gồm `Nam`, `Nữ`, `Khác` |
| `birth_date` | date | Bắt buộc, `YYYY-MM-DD` |
| `email` | email | Bắt buộc |
| `phone` | tel | Bắt buộc, 10 chữ số |
| `address` | text | |
| `hobbies` | textarea | |
| `class_id` | `<select>` | Bắt buộc; đổ từ `GET /api/classes`, `value` = `id`, chữ hiển thị `class code – name` |
| `avatar` | file | `accept="image/jpeg,image/png,image/webp"`, **không** `required` |
| `remove_avatar` | checkbox, `value="1"` | Chỉ hiện ở form **sửa** |
| *(kỹ năng)* | các hàng nhập động | Xem 5.1 |
| *(mạng xã hội)* | các hàng nhập động | Xem 5.1 |

Mẫu cấu trúc một ô nhập (để hiện lỗi theo từng trường):

```html
<div class="form-group">
  <label for="student_code">Mã sinh viên *</label>
  <input type="text" id="student_code" name="student_code">
  <span class="field-error" data-error-for="student_code"></span>
</div>
```

Quy tắc:
- `id` của input = `name` của input. Mỗi input có `<span class="field-error" data-error-for="<tên trường>">` ngay dưới.
- Lấy dữ liệu bằng `new FormData(form)`, **không tự ghép JSON** và **không tự đặt header `Content-Type`** khi gửi FormData.
- Khi **sửa** mà không chọn ảnh mới: input file trống vẫn gửi một file rỗng. Trước khi gửi: `if (!fd.get("avatar") || fd.get("avatar").size === 0) fd.delete("avatar");`
- Dùng `<button type="submit">` và bắt sự kiện `submit` của form; **vô hiệu hóa nút** khi đang gửi.
- Form sửa: nạp sẵn dữ liệu từ `GET /api/students/{id}` (admin nhận đủ trường, không bị ẩn).

### 5.1 Kỹ năng và mạng xã hội (dạng hàng nhập động)

Giao diện: mỗi kỹ năng là một hàng gồm tên (có gợi ý từ `GET /api/skills?q=`) và mức 1–5; mỗi mạng xã hội là một hàng gồm nền tảng và URL; có nút "+ Thêm" và "Xóa hàng". Khi gửi, **gom các hàng thành mảng rồi gửi dưới dạng chuỗi JSON**:

```javascript
const fd = new FormData(form);
fd.set("skills", JSON.stringify(readSkillRows()));           // [{ name: "Python", level: 4 }]
fd.set("social_links", JSON.stringify(readSocialRows()));    // [{ platform: "GitHub", url: "https://..." }]
```

- Hàng bỏ trống hoàn toàn thì **không đưa vào mảng**.
- Khi **sửa**: nạp các hàng từ `skills` và `social_links` của hồ sơ. Luôn gửi cả hai khóa (kể cả `"[]"`), vì back-end thay toàn bộ danh sách khi khóa có mặt.
- Mỗi nền tảng chỉ một hàng (nên dùng dropdown: Facebook, GitHub, LinkedIn, Khác → nhập tên). Lỗi dạng `skills[1].level` hoặc `social_links[0].url` hiện ngay tại hàng tương ứng.

---

## 6. Sinh viên gửi yêu cầu cập nhật — `student/profile-edit.html`

Khác với form admin, trang này gửi **JSON** (không có ảnh): `api("/api/me/update-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })`.

- Chỉ có các ô: `phone`, `address`, `hobbies`, cùng hàng nhập động kỹ năng và mạng xã hội (dùng lại cách làm ở 5.1). **Không có** mã SV, họ tên, email, lớp, ảnh (chỉ admin sửa); nên hiện các trường đó dạng chỉ đọc kèm ghi chú "Liên hệ admin để sửa".
- Nạp sẵn dữ liệu hiện tại từ `GET /api/me/profile`.
- **Chỉ gửi những khóa người dùng đã thay đổi** (so với dữ liệu hiện tại). Không thay đổi gì thì báo "Bạn chưa thay đổi thông tin nào" và không gọi API. `skills`/`social_links` đã thay đổi thì gửi cả danh sách mới.
- Xóa hết nội dung `address`/`hobbies` thì gửi `""`; `phone` không được để trống.
- Lỗi 400 "Bạn đang có yêu cầu chờ duyệt": hiện thông báo chung ở `#form-error`; nên ẩn hoặc vô hiệu hóa nút gửi nếu `GET /api/me/update-requests` cho thấy đang có yêu cầu `pending`.
- `student/profile.html` hiển thị hồ sơ và **lịch sử yêu cầu** với nhãn trạng thái; yêu cầu bị từ chối hiện `reject_reason`.

---

## 7. Lỗi và trạng thái (cùng một kiểu ở mọi trang)

Back-end trả lỗi dạng `{ "error": "...", "field": "..." | null, "code"?: "..." }`. Xử lý bằng `components/form-errors.js` (lỗi trong form) và `components/notify.js` (thông báo chung):

- `field` có giá trị → điền `error` vào `<span data-error-for="field">`, thêm class `input-invalid` cho ô nhập. Với `skills[1].level`, `social_links[0].url`: hiện ở hàng tương ứng.
- `field` là `null` → hiện `error` ở `#form-error` (hoặc vùng thông báo chung).
- Trước mỗi lần gửi: xóa hết lỗi cũ.
- **Không tự viết lại thông báo lỗi**, hiển thị đúng `error` back-end trả về.
- `api()` tự xử lý 401 và `MUST_CHANGE_PASSWORD`; trang không cần làm thêm. Riêng trang login hiện lỗi (kể cả `ACCOUNT_LOCKED`), không chuyển hướng.

Các trạng thái cần có ở mọi trang tải dữ liệu:

| Trạng thái | Hiển thị |
|---|---|
| Đang tải | "Đang tải..." trong `#status-message` |
| Không có dữ liệu | "Không có kết quả" |
| Lỗi mạng / 500 | "Không thể kết nối máy chủ, vui lòng thử lại" |
| Thành công (lưu/xóa/duyệt) | Thông báo ngắn rồi chuyển trang hoặc tải lại danh sách |

---

## 8. Danh sách, tìm kiếm, lọc, phân trang

- Tham số gửi API: `q`, `major_id`, `class_id`, `sort` (`newest` / `name` / `class`), `page`, `page_size` (đúng như `API.md`).
- Gõ vào ô tìm kiếm: **chờ 300ms** sau khi ngừng gõ rồi mới gọi API (debounce).
- Đổi ô tìm, ngành, lớp hoặc sắp xếp → đặt `page = 1`.
- Chọn ngành → nạp lại dropdown lớp bằng `GET /api/classes?major_id=`.
- Cỡ trang: trang User **12**, trang Admin **10**, nhật ký **20**.
- Phân trang dựng từ `total_pages`; một hàm `renderPagination()` dùng chung trong `components/pagination.js`.
- **Luôn để back-end lọc/tìm/sắp xếp**, không tự lọc lại phía client.

---

## 9. Hiển thị dữ liệu

- `avatar_url` dùng thẳng làm `src`. Thêm xử lý `error` của ảnh: lỗi → đổi `src` thành `/uploads/default-avatar.png`. Khung ảnh vuông + `object-fit: cover`.
- **Các trường có thể là `null`**: `email`, `phone`, `address`, `birth_date` bị ẩn với khách và người khác (API.md mục 3.6), và `address`, `hobbies`, `updated_at` có thể chưa có. Hiện "—" hoặc ẩn dòng đó. `skills`, `social_links` rỗng → ẩn mục tương ứng.
- Mức kỹ năng `level` 1–5: hiện thanh hoặc 5 chấm.
- Ngày: hàm `formatDate()` trong `utils/format.js` hiển thị `dd/mm/yyyy` (và `dd/mm/yyyy HH:mm` cho ngày giờ).
- Nhãn trạng thái yêu cầu dùng class dùng chung: `.badge-pending` (Chờ duyệt), `.badge-approved` (Đã duyệt), `.badge-rejected` (Từ chối).
- **Chống XSS:** dữ liệu người dùng nhập (tên, sở thích, địa chỉ, URL...) chèn bằng `element.textContent = ...`, hoặc qua `escapeHtml()` nếu phải ghép chuỗi vào `innerHTML`. Tuyệt đối không ghép trực tiếp. Link mạng xã hội: chỉ gắn vào `href` khi bắt đầu bằng `http://` hoặc `https://`, và thêm `rel="noopener noreferrer"`.

---

## 10. Các trang admin đặc thù

**`admin/manage.html`:** bảng sinh viên (ảnh nhỏ, mã SV, họ tên, lớp, email, nút Sửa/Xóa), tìm kiếm, lọc ngành/lớp, sắp xếp. Nút Xóa bắt buộc `confirm(...)` trước khi gọi `DELETE`; sau khi xóa tải lại trang hiện tại (nếu trang hết dữ liệu thì lùi một trang).

**`admin/classes.html`:** hai bảng/khối: **Ngành** và **Lớp**, thêm/sửa ngay trong trang (modal hoặc hàng nhập). Lớp chọn ngành bằng dropdown. Hiện `student_count` / `class_count`; xóa bị từ chối (400) thì hiện nguyên `error` của back-end.

**`admin/requests.html`:**
- Bộ lọc `status` (mặc định `pending`), danh sách phân trang.
- Bấm một yêu cầu → modal gọi `GET /api/update-requests/{id}`, hiển thị bảng **"Trường | Hiện tại | Đề nghị"** từ `current` và `new_data` (kỹ năng/mạng xã hội hiển thị dạng danh sách).
- Nút **Duyệt** (`POST .../approve`) và **Từ chối** (`POST .../reject`). Từ chối **bắt buộc nhập lý do** (`reject_reason`); lỗi hiện dưới ô lý do.
- Chỉ yêu cầu `pending` mới có nút Duyệt/Từ chối.

**`admin/audit.html`:** bảng nhật ký mới nhất trước; bộ lọc `action`, `target_type`, `target_id`. `old_data` / `new_data` là JSON tự do: hiển thị dạng danh sách "trường: giá trị" trong dòng mở rộng hoặc modal, **không** chèn bằng `innerHTML`.

**`admin/dashboard.html`:** thẻ số liệu (`total_students`, `total_classes`, `total_majors`, `pending_requests`), biểu đồ cột/tròn từ `by_class` (Chart.js, nạp bằng thẻ `<script>` từ CDN), danh sách `recent`.

---

## 11. CSS dùng chung

Khai báo biến một lần trong `assets/css/base.css`:

```css
:root {
  --color-primary: #1a73e8;
  --color-success: #2e7d32;
  --color-warning: #f9a825;
  --color-danger:  #d32f2f;
  --color-bg:      #f5f6fa;
  --color-text:    #222;
  --radius: 8px;
  --space: 16px;
  --font: "Segoe UI", Roboto, Arial, sans-serif;
}
```

Lớp dùng chung (định nghĩa trong `components.css`): `.btn`, `.btn-primary`, `.btn-success`, `.btn-warning`, `.btn-danger`, `.card`, `.table`, `.form-group`, `.field-error`, `.input-invalid`, `.status-message`, `.badge-pending`, `.badge-approved`, `.badge-rejected`, `.modal`.

- Breakpoint: **768px** (tablet) và **480px** (mobile); làm mobile-first nếu được.
- Không dùng `!important`, không viết CSS trong `style=""`.
- Bảng rộng đặt trong khung `overflow-x: auto`.

---

## 12. Git

- Mỗi người một nhánh: `feature/ten-ban-user-pages`, `feature/ten-ban-admin-pages`.
- Gộp vào `main` qua pull request, người kia (hoặc back-end) xem qua rồi mới gộp.
- Không sửa file của người khác; muốn sửa file dùng chung thì nhắn người giữ file.
- Commit nhỏ, thông điệp rõ: `Them trang danh sach sinh vien`, `Sua loi phan trang`.
- Không commit ảnh người dùng thật trong `uploads/` và file cấu hình riêng (`.env`).

---

## 13. Kiểm tra trước khi báo "xong trang"

- [ ] Chạy được qua `http://localhost:8000`, không có lỗi đỏ trong Console.
- [ ] Mọi đường dẫn (`<link>`, `<script>`, `<a>`, `<img>`, `location.href`) viết tuyệt đối từ gốc (`/assets/...`, `/admin/...`); trang trong `admin/` và `student/` vẫn tải đủ CSS/JS.
- [ ] Thứ tự nạp script đúng (mục 3.1), `pages/<trang>.js` ở cuối.
- [ ] Mọi lời gọi API đều qua `api()`; trang cần đăng nhập gọi `requireLogin(...)` đầu tiên.
- [ ] Tên `name`/query khớp `API.md` (xem tab *Network* của DevTools).
- [ ] Có đủ 4 trạng thái: đang tải, rỗng, lỗi, thành công.
- [ ] Hiển thị lỗi đúng từng ô (`field`), lỗi chung (`field = null`), và lỗi ở hàng kỹ năng/mạng xã hội.
- [ ] Thử đúng các vai trò: khách, sinh viên, admin (và sinh viên bị buộc đổi mật khẩu). Truy cập sai vai trò thì bị chuyển trang.
- [ ] Thử dữ liệu mẫu đặc biệt (API.md mục 7): tên rất dài, không ảnh, không kỹ năng, nhiều kỹ năng, trường bị ẩn (`null`).
- [ ] Xem được trên điện thoại (DevTools → chế độ mobile).

## 14. Khi gặp vấn đề giữa hai phía

- API trả khác với `API.md` → gửi back-end: **URL + method**, **dữ liệu đã gửi**, **phản hồi nhận được** (chụp tab Network).
- Front-end cần thêm/sửa trường hoặc endpoint → **nói với back-end trước**, back-end cập nhật `API.md`, rồi cả hai cùng làm. Không tự đoán rồi code.

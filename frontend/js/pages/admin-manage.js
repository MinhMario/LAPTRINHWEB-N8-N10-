/**
 * js/pages/admin-manage.js - Quản lý danh sách sinh viên (tìm kiếm, lọc, sắp xếp, phân trang, xóa)
 */

const PAGE_SIZE = 10;
let currentPage = 1;

const searchInput = document.getElementById("search-input");
const majorFilter = document.getElementById("major-filter");
const classFilter = document.getElementById("class-filter");
const sortSelect = document.getElementById("sort-select");
const tableBody = document.getElementById("student-table-body");
const pagination = document.getElementById("pagination");

// ── BỘ LỌC NGÀNH / LỚP ───────────────────────────────────────────────────────

function fillSelect(select, items, firstLabel, labelFn) {
  select.textContent = "";

  const firstOpt = document.createElement("option");
  firstOpt.value = "";
  firstOpt.textContent = firstLabel;
  select.appendChild(firstOpt);

  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = labelFn(item);
    select.appendChild(opt);
  });
}

async function loadMajors() {
  try {
    const majors = await api("/api/majors");
    fillSelect(majorFilter, majors, "Tất cả ngành", (m) => `${m.code} - ${m.name}`);
  } catch {
    // Nếu lỗi tải ngành thì danh sách sinh viên vẫn hoạt động bình thường
  }
}

async function loadClasses() {
  const majorId = majorFilter.value;
  const url = majorId
    ? `/api/classes?major_id=${encodeURIComponent(majorId)}`
    : "/api/classes";

  try {
    const classes = await api(url);
    fillSelect(classFilter, classes, "Tất cả lớp", (c) => `${c.code} - ${c.name}`);
  } catch {
    // Bỏ qua lỗi phụ
  }
}

// ── DỰNG BẢNG SINH VIÊN ──────────────────────────────────────────────────────

function buildRow(student) {
  const tr = document.createElement("tr");

  // Cột ảnh
  const tdImg = document.createElement("td");
  const img = document.createElement("img");
  img.className = "avatar-sm";
  img.alt = "";
  setAvatarSrc(img, student.avatar_url);
  tdImg.appendChild(img);

  // Cột mã SV
  const tdCode = document.createElement("td");
  tdCode.textContent = student.student_code;

  // Cột họ tên (link sang trang chi tiết)
  const tdName = document.createElement("td");
  tdName.className = "cell-name";
  const detailLink = document.createElement("a");
  detailLink.href = `/pages/detail.html?id=${encodeURIComponent(student.id)}`;
  detailLink.textContent = student.full_name;
  tdName.appendChild(detailLink);

  // Cột lớp & email
  const tdClass = document.createElement("td");
  tdClass.textContent = student.class_code;
  tdClass.title = student.class_name;

  const tdEmail = document.createElement("td");
  tdEmail.textContent = student.email || "---";

  // Cột thao tác (Sửa / Xóa)
  const tdActions = document.createElement("td");
  const actionsWrap = document.createElement("div");
  actionsWrap.className = "cell-actions";

  const editLink = document.createElement("a");
  editLink.className = "btn btn-warning btn-sm";
  editLink.href = `/pages/admin-form.html?id=${encodeURIComponent(student.id)}`;
  editLink.textContent = "Sửa";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn btn-danger btn-sm";
  deleteBtn.textContent = "Xóa";
  deleteBtn.addEventListener("click", () => deleteStudent(student, deleteBtn));

  actionsWrap.append(editLink, deleteBtn);
  tdActions.appendChild(actionsWrap);

  tr.append(tdImg, tdCode, tdName, tdClass, tdEmail, tdActions);
  return tr;
}

// ── TẢI DANH SÁCH & XÓA ──────────────────────────────────────────────────────

async function loadStudents() {
  showStatus("Đang tải...", "info");
  tableBody.textContent = "";

  const params = new URLSearchParams({
    page: currentPage,
    page_size: PAGE_SIZE,
    sort: sortSelect.value,
  });

  const keyword = searchInput.value.trim();
  if (keyword) params.set("q", keyword);
  if (majorFilter.value) params.set("major_id", majorFilter.value);
  if (classFilter.value) params.set("class_id", classFilter.value);

  try {
    const data = await api(`/api/students?${params}`);

    // Nếu vừa xóa hết sinh viên ở trang cuối thì tự lùi về trang trước
    if (data.items.length === 0 && currentPage > 1 && data.total_pages > 0) {
      currentPage = data.total_pages;
      return loadStudents();
    }

    if (data.items.length === 0) {
      showStatus("Không có kết quả", "empty");
      pagination.textContent = "";
      return;
    }

    hideStatus();
    data.items.forEach((student) => tableBody.appendChild(buildRow(student)));
    renderPagination(pagination, data.page, data.total_pages, (page) => {
      currentPage = page;
      loadStudents();
    });
  } catch (err) {
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
    pagination.textContent = "";
  }
}

async function deleteStudent(student, button) {
  const confirmed = confirm(
    `Xóa sinh viên ${student.full_name} (${student.student_code})?\nTài khoản của sinh viên sẽ bị khóa.`
  );
  if (!confirmed) return;

  button.disabled = true;
  try {
    await api(`/api/students/${student.id}`, { method: "DELETE" });
    await loadStudents();
    showStatus("Đã xóa sinh viên", "success");
  } catch (err) {
    button.disabled = false;
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
  }
}

// ── SỰ KIỆN & KHỞI TẠO ───────────────────────────────────────────────────────

function resetToFirstPage() {
  currentPage = 1;
  loadStudents();
}

searchInput.addEventListener("input", debounce(resetToFirstPage, 300));
sortSelect.addEventListener("change", resetToFirstPage);
classFilter.addEventListener("change", resetToFirstPage);
majorFilter.addEventListener("change", async () => {
  await loadClasses();
  resetToFirstPage();
});

// ── XUẤT EXCEL (GET /api/students/export) — xuất theo đúng bộ lọc đang chọn ──
document.getElementById("btn-export").addEventListener("click", () => {
  const params = new URLSearchParams({ sort: sortSelect.value });

  const keyword = searchInput.value.trim();
  if (keyword) params.set("q", keyword);
  if (majorFilter.value) params.set("major_id", majorFilter.value);
  if (classFilter.value) params.set("class_id", classFilter.value);

  // Điều hướng trực tiếp để trình duyệt tải file (cookie đăng nhập vẫn được gửi kèm)
  location.href = `/api/students/export?${params}`;
});

(async function init() {
  const me = await requireLogin("admin");
  if (!me) return;

  initAdminNav(me);
  await Promise.all([loadMajors(), loadClasses()]);
  loadStudents();
})();
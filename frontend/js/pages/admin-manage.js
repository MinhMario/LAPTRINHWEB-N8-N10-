// manage.js - bảng sinh viên (admin): tìm kiếm, lọc ngành/lớp, sắp xếp, phân trang, xóa
const PAGE_SIZE = 10;
let currentPage = 1;

const searchInput = document.getElementById("search-input");
const majorFilter = document.getElementById("major-filter");
const classFilter = document.getElementById("class-filter");
const sortSelect = document.getElementById("sort-select");
const tableBody = document.getElementById("student-table-body");
const pagination = document.getElementById("pagination");

function fillSelect(select, items, firstLabel, labelFn) {
  select.textContent = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = firstLabel;
  select.appendChild(first);
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
  } catch { /* lọc ngành không dùng được, danh sách vẫn hoạt động */ }
}

// Chọn ngành -> nạp lại dropdown lớp bằng GET /api/classes?major_id=
async function loadClasses() {
  const majorId = majorFilter.value;
  const url = majorId ? `/api/classes?major_id=${encodeURIComponent(majorId)}` : "/api/classes";
  try {
    const classes = await api(url);
    fillSelect(classFilter, classes, "Tất cả lớp", (c) => `${c.code} - ${c.name}`);
  } catch { /* bỏ qua */ }
}

function buildRow(s) {
  const tr = document.createElement("tr");

  const tdImg = document.createElement("td");
  const img = document.createElement("img");
  img.className = "avatar-sm";
  img.alt = "";
  img.src = s.avatar_url;
  bindAvatarFallback(img);
  tdImg.appendChild(img);

  const tdCode = document.createElement("td");
  tdCode.textContent = s.student_code;

  const tdName = document.createElement("td");
  tdName.className = "cell-name";
  const link = document.createElement("a");
  link.href = `/pages/detail.html?id=${encodeURIComponent(s.id)}`;
  link.textContent = s.full_name;
  tdName.appendChild(link);

  const tdClass = document.createElement("td");
  tdClass.textContent = s.class_code;
  tdClass.title = s.class_name;

  const tdEmail = document.createElement("td");
  tdEmail.textContent = s.email || "---";

  const tdAct = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "cell-actions";
  const edit = document.createElement("a");
  edit.className = "btn btn-warning btn-sm";
  edit.href = `/pages/admin-form.html?id=${encodeURIComponent(s.id)}`;
  edit.textContent = "Sửa";
  const del = document.createElement("button");
  del.type = "button";
  del.className = "btn btn-danger btn-sm";
  del.textContent = "Xóa";
  del.addEventListener("click", () => deleteStudent(s, del));
  actions.append(edit, del);
  tdAct.appendChild(actions);

  tr.append(tdImg, tdCode, tdName, tdClass, tdEmail, tdAct);
  return tr;
}

async function loadStudents() {
  showStatus("Đang tải...", "info");
  tableBody.textContent = "";
  const params = new URLSearchParams({ page: currentPage, page_size: PAGE_SIZE, sort: sortSelect.value });
  const q = searchInput.value.trim();
  if (q) params.set("q", q);
  if (majorFilter.value) params.set("major_id", majorFilter.value);
  if (classFilter.value) params.set("class_id", classFilter.value);

  try {
    const data = await api(`/api/students?${params}`);
    // Xóa hết bản ghi ở trang cuối -> lùi một trang
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
    data.items.forEach((s) => tableBody.appendChild(buildRow(s)));
    renderPagination(pagination, data.page, data.total_pages, (p) => { currentPage = p; loadStudents(); });
  } catch (err) {
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
    pagination.textContent = "";
  }
}

async function deleteStudent(student, button) {
  if (!confirm(`Xóa sinh viên ${student.full_name} (${student.student_code})?\nTài khoản của sinh viên sẽ bị khóa.`)) return;
  button.disabled = true;
  try {
    await api(`/api/students/${student.id}`, { method: "DELETE" });
    await loadStudents(); // tải lại đúng trang hiện tại
    showStatus("Đã xóa sinh viên", "success");
  } catch (err) {
    button.disabled = false;
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
  }
}

function resetToFirstPage() { currentPage = 1; loadStudents(); }

searchInput.addEventListener("input", debounce(resetToFirstPage, 300));
sortSelect.addEventListener("change", resetToFirstPage);
classFilter.addEventListener("change", resetToFirstPage);
majorFilter.addEventListener("change", async () => {
  await loadClasses();
  resetToFirstPage();
});

(async function init() {
  const me = await requireLogin("admin");
  if (!me) return;
  initAdminNav(me);
  await Promise.all([loadMajors(), loadClasses()]);
  loadStudents();
})();

/**
 * js/pages/admin-classes.js - Quản lý NGÀNH và LỚP (modal thêm/sửa, xóa có xác nhận)
 */

const majorBody = document.getElementById("major-table-body");
const classBody = document.getElementById("class-table-body");
const majorFilter = document.getElementById("major-filter");
const majorModal = document.getElementById("major-modal");
const classModal = document.getElementById("class-modal");
const majorForm = document.getElementById("major-form");
const classForm = document.getElementById("class-form");
const classMajorSelect = document.getElementById("class-major");

let majorsCache = [];
let editingMajorId = null; // null = chế độ thêm mới
let editingClassId = null;

// ── HÀM DỰNG Ô BẢNG & DROPDOWN ───────────────────────────────────────────────

function createCell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function createActionCell(onEdit, onDelete) {
  const td = document.createElement("td");
  const wrap = document.createElement("div");
  wrap.className = "cell-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn btn-warning btn-sm";
  editBtn.textContent = "Sửa";
  editBtn.addEventListener("click", onEdit);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn btn-danger btn-sm";
  deleteBtn.textContent = "Xóa";
  deleteBtn.addEventListener("click", () => onDelete(deleteBtn));

  wrap.append(editBtn, deleteBtn);
  td.appendChild(wrap);
  return td;
}

function appendEmptyRow(tbody, colspan) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = colspan;
  td.className = "text-muted";
  td.textContent = "Không có kết quả";
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function populateMajorSelect(select, firstLabel) {
  const previousValue = select.value;
  select.textContent = "";

  const firstOpt = document.createElement("option");
  firstOpt.value = "";
  firstOpt.textContent = firstLabel;
  select.appendChild(firstOpt);

  majorsCache.forEach((major) => {
    const opt = document.createElement("option");
    opt.value = major.id;
    opt.textContent = `${major.code} - ${major.name}`;
    select.appendChild(opt);
  });

  select.value = previousValue;
}

function fillMajorSelects() {
  populateMajorSelect(majorFilter, "Tất cả ngành");
  populateMajorSelect(classMajorSelect, "-- Chọn ngành --");
}

// ── QUẢN LÝ NGÀNH ────────────────────────────────────────────────────────────

async function loadMajors() {
  majorsCache = await api("/api/majors");
  majorBody.textContent = "";

  if (!majorsCache.length) {
    appendEmptyRow(majorBody, 4);
  }

  majorsCache.forEach((major) => {
    const tr = document.createElement("tr");
    tr.append(
      createCell(major.code),
      createCell(major.name, "cell-name"),
      createCell(major.class_count),
      createActionCell(
        () => openMajorModal(major),
        (btn) => deleteMajor(major, btn)
      )
    );
    majorBody.appendChild(tr);
  });

  fillMajorSelects();
}

function openMajorModal(major) {
  adminClearErrors(majorForm);
  editingMajorId = major ? major.id : null;

  document.getElementById("major-modal-title").textContent = major ? "Sửa ngành" : "Thêm ngành";
  majorForm.elements.code.value = major ? major.code : "";
  majorForm.elements.name.value = major ? major.name : "";

  majorModal.hidden = false;
  majorForm.elements.code.focus();
}

function closeMajorModal() {
  majorModal.hidden = true;
}

async function deleteMajor(major, button) {
  if (!confirm(`Xóa ngành ${major.code} - ${major.name}?`)) return;

  button.disabled = true;
  try {
    await api(`/api/majors/${major.id}`, { method: "DELETE" });
    await refreshAll();
    showStatus("Đã xóa ngành", "success");
  } catch (err) {
    button.disabled = false;
    showStatus((err && err.error) || "Có lỗi xảy ra", "error");
  }
}

majorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminClearErrors(majorForm);

  const body = {
    code: majorForm.elements.code.value.trim(),
    name: majorForm.elements.name.value.trim(),
  };

  const submitBtn = document.getElementById("major-submit");
  submitBtn.disabled = true;

  try {
    const url = editingMajorId ? `/api/majors/${editingMajorId}` : "/api/majors";
    const method = editingMajorId ? "PUT" : "POST";

    await api(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    closeMajorModal();
    await refreshAll();
    showStatus(editingMajorId ? "Đã cập nhật ngành" : "Đã thêm ngành", "success");
  } catch (err) {
    adminShowError(err, majorForm);
  } finally {
    submitBtn.disabled = false;
  }
});

// ── QUẢN LÝ LỚP ──────────────────────────────────────────────────────────────

async function loadClasses() {
  const url = majorFilter.value
    ? `/api/classes?major_id=${encodeURIComponent(majorFilter.value)}`
    : "/api/classes";

  const classes = await api(url);
  classBody.textContent = "";

  if (!classes.length) {
    appendEmptyRow(classBody, 5);
  }

  classes.forEach((cls) => {
    const tr = document.createElement("tr");
    tr.append(
      createCell(cls.code),
      createCell(cls.name, "cell-name"),
      createCell(cls.major_name),
      createCell(cls.student_count),
      createActionCell(
        () => openClassModal(cls),
        (btn) => deleteClass(cls, btn)
      )
    );
    classBody.appendChild(tr);
  });
}

function openClassModal(cls) {
  adminClearErrors(classForm);
  editingClassId = cls ? cls.id : null;

  document.getElementById("class-modal-title").textContent = cls ? "Sửa lớp" : "Thêm lớp";
  classForm.elements.code.value = cls ? cls.code : "";
  classForm.elements.name.value = cls ? cls.name : "";
  classForm.elements.major_id.value = cls ? cls.major_id : "";

  classModal.hidden = false;
  classForm.elements.code.focus();
}

function closeClassModal() {
  classModal.hidden = true;
}

async function deleteClass(cls, button) {
  if (!confirm(`Xóa lớp ${cls.code} - ${cls.name}?`)) return;

  button.disabled = true;
  try {
    await api(`/api/classes/${cls.id}`, { method: "DELETE" });
    await refreshAll();
    showStatus("Đã xóa lớp", "success");
  } catch (err) {
    button.disabled = false;
    showStatus((err && err.error) || "Có lỗi xảy ra", "error");
  }
}

classForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminClearErrors(classForm);

  const majorValue = classForm.elements.major_id.value;
  const body = {
    code: classForm.elements.code.value.trim(),
    name: classForm.elements.name.value.trim(),
    major_id: majorValue ? Number(majorValue) : null,
  };

  const submitBtn = document.getElementById("class-submit");
  submitBtn.disabled = true;

  try {
    const url = editingClassId ? `/api/classes/${editingClassId}` : "/api/classes";
    const method = editingClassId ? "PUT" : "POST";

    await api(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    closeClassModal();
    await refreshAll();
    showStatus(editingClassId ? "Đã cập nhật lớp" : "Đã thêm lớp", "success");
  } catch (err) {
    adminShowError(err, classForm);
  } finally {
    submitBtn.disabled = false;
  }
});

// ── TẢI LẠI & KHỞI TẠO ───────────────────────────────────────────────────────

async function refreshAll() {
  try {
    await loadMajors();
    await loadClasses();
  } catch (err) {
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
  }
}

document.getElementById("add-major-btn").addEventListener("click", () => openMajorModal(null));
document.getElementById("add-class-btn").addEventListener("click", () => openClassModal(null));
document.getElementById("major-cancel").addEventListener("click", closeMajorModal);
document.getElementById("major-cancel-x").addEventListener("click", closeMajorModal);
document.getElementById("class-cancel").addEventListener("click", closeClassModal);
document.getElementById("class-cancel-x").addEventListener("click", closeClassModal);

majorFilter.addEventListener("change", () => {
  loadClasses().catch((err) => showStatus((err && err.error) || "Có lỗi xảy ra", "error"));
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMajorModal();
    closeClassModal();
  }
});

(async function init() {
  const me = await requireLogin("admin");
  if (!me) return;

  initAdminNav(me);
  showStatus("Đang tải...", "info");
  await refreshAll();

  if (document.getElementById("status-message").textContent === "Đang tải...") {
    hideStatus();
  }
})();
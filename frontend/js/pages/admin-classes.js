// classes.js - quản lý NGÀNH và LỚP ngay trong một trang (modal thêm/sửa, xóa có confirm)
const majorBody = document.getElementById("major-table-body");
const classBody = document.getElementById("class-table-body");
const majorFilter = document.getElementById("major-filter");
const majorModal = document.getElementById("major-modal");
const classModal = document.getElementById("class-modal");
const majorForm = document.getElementById("major-form");
const classForm = document.getElementById("class-form");
const classMajorSelect = document.getElementById("class-major");

let majorsCache = [];
let editingMajorId = null; // null = thêm
let editingClassId = null;

function cell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function actionCell(onEdit, onDelete) {
  const td = document.createElement("td");
  const wrap = document.createElement("div");
  wrap.className = "cell-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "btn btn-warning btn-sm";
  edit.textContent = "Sửa";
  edit.addEventListener("click", onEdit);
  const del = document.createElement("button");
  del.type = "button";
  del.className = "btn btn-danger btn-sm";
  del.textContent = "Xóa";
  del.addEventListener("click", () => onDelete(del));
  wrap.append(edit, del);
  td.appendChild(wrap);
  return td;
}

function emptyRow(tbody, colspan) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = colspan;
  td.className = "text-muted";
  td.textContent = "Không có kết quả";
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function fillMajorSelects() {
  const fill = (select, firstLabel) => {
    const keep = select.value;
    select.textContent = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = firstLabel;
    select.appendChild(first);
    majorsCache.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.code} - ${m.name}`;
      select.appendChild(opt);
    });
    select.value = keep;
  };
  fill(majorFilter, "Tất cả ngành");
  fill(classMajorSelect, "-- Chọn ngành --");
}

// ---------- Ngành ----------
async function loadMajors() {
  majorsCache = await api("/api/majors");
  majorBody.textContent = "";
  if (!majorsCache.length) emptyRow(majorBody, 4);
  majorsCache.forEach((m) => {
    const tr = document.createElement("tr");
    tr.append(
      cell(m.code),
      cell(m.name, "cell-name"),
      cell(m.class_count),
      actionCell(() => openMajorModal(m), (btn) => deleteMajor(m, btn)),
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

function closeMajorModal() { majorModal.hidden = true; }

async function deleteMajor(major, button) {
  if (!confirm(`Xóa ngành ${major.code} - ${major.name}?`)) return;
  button.disabled = true;
  try {
    await api(`/api/majors/${major.id}`, { method: "DELETE" });
    await refreshAll();
    showStatus("Đã xóa ngành", "success");
  } catch (err) {
    button.disabled = false;
    showStatus((err && err.error) || "Có lỗi xảy ra", "error"); // hiện nguyên error của back-end
  }
}

majorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminClearErrors(majorForm);
  const body = { code: majorForm.elements.code.value.trim(), name: majorForm.elements.name.value.trim() };
  const submit = document.getElementById("major-submit");
  submit.disabled = true;
  try {
    await api(editingMajorId ? `/api/majors/${editingMajorId}` : "/api/majors", {
      method: editingMajorId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    closeMajorModal();
    await refreshAll();
    showStatus(editingMajorId ? "Đã cập nhật ngành" : "Đã thêm ngành", "success");
  } catch (err) {
    adminShowError(err, majorForm);
  } finally {
    submit.disabled = false;
  }
});

// ---------- Lớp ----------
async function loadClasses() {
  const url = majorFilter.value ? `/api/classes?major_id=${encodeURIComponent(majorFilter.value)}` : "/api/classes";
  const classes = await api(url);
  classBody.textContent = "";
  if (!classes.length) emptyRow(classBody, 5);
  classes.forEach((c) => {
    const tr = document.createElement("tr");
    tr.append(
      cell(c.code),
      cell(c.name, "cell-name"),
      cell(c.major_name),
      cell(c.student_count),
      actionCell(() => openClassModal(c), (btn) => deleteClass(c, btn)),
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

function closeClassModal() { classModal.hidden = true; }

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
  const body = {
    code: classForm.elements.code.value.trim(),
    name: classForm.elements.name.value.trim(),
    major_id: classForm.elements.major_id.value ? Number(classForm.elements.major_id.value) : null,
  };
  const submit = document.getElementById("class-submit");
  submit.disabled = true;
  try {
    await api(editingClassId ? `/api/classes/${editingClassId}` : "/api/classes", {
      method: editingClassId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    closeClassModal();
    await refreshAll();
    showStatus(editingClassId ? "Đã cập nhật lớp" : "Đã thêm lớp", "success");
  } catch (err) {
    adminShowError(err, classForm);
  } finally {
    submit.disabled = false;
  }
});

// ---------- Chung ----------
async function refreshAll() {
  try {
    await loadMajors(); // class_count thay đổi khi thêm/xóa lớp, nên nạp cả hai
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
  if (e.key === "Escape") { closeMajorModal(); closeClassModal(); }
});

(async function init() {
  const me = await requireLogin("admin");
  if (!me) return;
  initAdminNav(me);
  showStatus("Đang tải...", "info");
  await refreshAll();
  if (document.getElementById("status-message").textContent === "Đang tải...") hideStatus();
})();

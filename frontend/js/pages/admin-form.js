/**
 * js/pages/admin-form.js - Thêm (/pages/admin-form.html) hoặc Sửa (/pages/admin-form.html?id=X) sinh viên
 * Gửi dữ liệu bằng FormData (không tự đặt header Content-Type).
 */

const STUDENT_CODE_RE = /^[A-Z]\d{2}[A-Z]{4}\d{3}$/;
const PHONE_RE = /^0\d{9}$/;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PLATFORMS = ["Facebook", "GitHub", "LinkedIn"];

const form = document.getElementById("student-form");
const submitBtn = document.getElementById("submit-btn");
const skillRows = document.getElementById("skill-rows");
const socialRows = document.getElementById("social-rows");
const avatarInput = document.getElementById("avatar");
const avatarPreview = document.getElementById("avatar-preview");

const params = new URLSearchParams(location.search);
const studentId = params.get("id"); // null = thêm mới
const isEdit = studentId !== null;
let originalAvatarUrl = "/uploads/default-avatar.png";

bindAvatarFallback(avatarPreview);

// ── HÀNG NHẬP KỸ NĂNG ────────────────────────────────────────────────────────

function addSkillRow(skill = { name: "", level: 3 }) {
  const row = document.createElement("div");
  row.className = "admin-row skill-edit-row";

  // Ô nhập tên kỹ năng + gợi ý
  const nameCell = document.createElement("div");
  nameCell.className = "row-cell";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "form-control skill-edit-name";
  nameInput.maxLength = 50;
  nameInput.placeholder = "Tên kỹ năng";
  nameInput.setAttribute("list", "skill-suggestions");
  nameInput.setAttribute("aria-label", "Tên kỹ năng");
  nameInput.value = skill.name || "";
  nameInput.addEventListener("input", debounce(() => suggestSkills(nameInput.value.trim()), 300));

  const nameErr = document.createElement("span");
  nameErr.className = "field-error skill-edit-name-error";
  nameCell.append(nameInput, nameErr);

  // Ô chọn mức thành thạo (1..5)
  const levelCell = document.createElement("div");
  levelCell.className = "row-cell";

  const levelSelect = document.createElement("select");
  levelSelect.className = "form-select skill-edit-level";
  levelSelect.setAttribute("aria-label", "Mức kỹ năng");

  for (let i = 1; i <= 5; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${i}/5`;
    levelSelect.appendChild(opt);
  }
  levelSelect.value = String(skill.level || 3);

  const levelErr = document.createElement("span");
  levelErr.className = "field-error skill-edit-level-error";
  levelCell.append(levelSelect, levelErr);

  // Nút xóa hàng
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-danger btn-sm";
  removeBtn.textContent = "Xóa hàng";
  removeBtn.addEventListener("click", () => row.remove());

  row.append(nameCell, levelCell, removeBtn);
  skillRows.appendChild(row);
}

async function suggestSkills(keyword) {
  if (!keyword) return;

  try {
    const list = await api(`/api/skills?q=${encodeURIComponent(keyword)}`);
    const datalist = document.getElementById("skill-suggestions");
    datalist.textContent = "";

    list.forEach((skill) => {
      const opt = document.createElement("option");
      opt.value = skill.name;
      datalist.appendChild(opt);
    });
  } catch {
    // Gợi ý kỹ năng là tính năng phụ, bỏ qua nếu lỗi
  }
}

function readSkillRows() {
  const result = [];
  skillRows.querySelectorAll(".skill-edit-row").forEach((row) => {
    const name = row.querySelector(".skill-edit-name").value.trim();
    if (!name) return;

    const level = Number(row.querySelector(".skill-edit-level").value);
    result.push({ name, level });
  });
  return result;
}

// ── HÀNG NHẬP MẠNG XÃ HỘI ────────────────────────────────────────────────────

function addSocialRow(link = { platform: "Facebook", url: "" }) {
  const row = document.createElement("div");
  row.className = "admin-row social-row";

  // Ô chọn nền tảng (hoặc nhập tên nền tảng khác)
  const platCell = document.createElement("div");
  platCell.className = "row-cell";

  const select = document.createElement("select");
  select.className = "form-select social-platform";
  select.setAttribute("aria-label", "Nền tảng");

  [...PLATFORMS, "Khác"].forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  const customInput = document.createElement("input");
  customInput.type = "text";
  customInput.className = "form-control social-custom";
  customInput.maxLength = 30;
  customInput.placeholder = "Tên nền tảng";
  customInput.setAttribute("aria-label", "Tên nền tảng khác");

  const platErr = document.createElement("span");
  platErr.className = "field-error social-platform-error";
  platCell.append(select, customInput, platErr);

  const isKnown = PLATFORMS.includes(link.platform);
  select.value = isKnown ? link.platform : "Khác";
  customInput.value = isKnown ? "" : link.platform || "";
  customInput.hidden = select.value !== "Khác";
  select.addEventListener("change", () => {
    customInput.hidden = select.value !== "Khác";
  });

  // Ô nhập đường dẫn URL
  const urlCell = document.createElement("div");
  urlCell.className = "row-cell";

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "form-control social-url";
  urlInput.maxLength = 255;
  urlInput.placeholder = "https://...";
  urlInput.setAttribute("aria-label", "Đường dẫn");
  urlInput.value = link.url || "";

  const urlErr = document.createElement("span");
  urlErr.className = "field-error social-url-error";
  urlCell.append(urlInput, urlErr);

  // Nút xóa hàng
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-danger btn-sm";
  removeBtn.textContent = "Xóa hàng";
  removeBtn.addEventListener("click", () => row.remove());

  row.append(platCell, urlCell, removeBtn);
  socialRows.appendChild(row);
}

function getPlatformName(row) {
  const select = row.querySelector(".social-platform");
  if (select.value === "Khác") {
    return row.querySelector(".social-custom").value.trim();
  }
  return select.value;
}

function readSocialRows() {
  const result = [];
  socialRows.querySelectorAll(".social-row").forEach((row) => {
    const url = row.querySelector(".social-url").value.trim();
    const isOther = row.querySelector(".social-platform").value === "Khác";
    const platform = getPlatformName(row);
    if (!url && (!isOther || !platform)) return;

    result.push({ platform, url });
  });
  return result;
}

/** Gắn data-error-for theo chỉ số mảng đã lọc hàng trống để hiện đúng lỗi từ API */
function labelDynamicRows() {
  let skillIndex = 0;
  skillRows.querySelectorAll(".skill-edit-row").forEach((row) => {
    if (!row.querySelector(".skill-edit-name").value.trim()) return;
    row.querySelector(".skill-edit-name-error").dataset.errorFor = `skills[${skillIndex}].name`;
    row.querySelector(".skill-edit-level-error").dataset.errorFor = `skills[${skillIndex}].level`;
    skillIndex++;
  });

  let socialIndex = 0;
  socialRows.querySelectorAll(".social-row").forEach((row) => {
    const url = row.querySelector(".social-url").value.trim();
    const isOther = row.querySelector(".social-platform").value === "Khác";
    if (!url && (!isOther || !getPlatformName(row))) return;
    row.querySelector(".social-platform-error").dataset.errorFor = `social_links[${socialIndex}].platform`;
    row.querySelector(".social-url-error").dataset.errorFor = `social_links[${socialIndex}].url`;
    socialIndex++;
  });
}

// ── VALIDATE PHÍA CLIENT ─────────────────────────────────────────────────────

function validateClient() {
  const errors = [];
  const val = (name) => form.elements[name].value.trim();

  const code = val("student_code").toUpperCase();
  if (!code) {
    errors.push({ field: "student_code", error: "Vui lòng nhập mã sinh viên" });
  } else if (!STUDENT_CODE_RE.test(code)) {
    errors.push({ field: "student_code", error: "Mã sinh viên không đúng định dạng (VD: B24DTCN001)" });
  }

  if (!val("full_name")) {
    errors.push({ field: "full_name", error: "Vui lòng nhập họ tên" });
  }

  if (!val("gender")) {
    errors.push({ field: "gender", error: "Vui lòng chọn giới tính" });
  }

  if (!val("birth_date")) {
    errors.push({ field: "birth_date", error: "Vui lòng chọn ngày sinh" });
  } else if (new Date(val("birth_date")) > new Date()) {
    errors.push({ field: "birth_date", error: "Ngày sinh không được ở tương lai" });
  }

  if (!val("email")) {
    errors.push({ field: "email", error: "Vui lòng nhập email" });
  } else if (!form.elements.email.checkValidity()) {
    errors.push({ field: "email", error: "Email không đúng định dạng" });
  }

  if (!val("phone")) {
    errors.push({ field: "phone", error: "Vui lòng nhập số điện thoại" });
  } else if (!PHONE_RE.test(val("phone"))) {
    errors.push({ field: "phone", error: "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0" });
  }

  if (!val("class_id")) {
    errors.push({ field: "class_id", error: "Vui lòng chọn lớp" });
  }

  const file = avatarInput.files[0];
  if (file && (!AVATAR_TYPES.includes(file.type) || file.size > MAX_AVATAR_SIZE)) {
    errors.push({ field: "avatar", error: "Ảnh chỉ chấp nhận jpg, png, webp và tối đa 2MB" });
  }

  return errors;
}

// ── NẠP DỮ LIỆU FORM ─────────────────────────────────────────────────────────

async function loadClassOptions() {
  const classes = await api("/api/classes");
  const select = document.getElementById("class_id");

  classes.forEach((cls) => {
    const opt = document.createElement("option");
    opt.value = cls.id;
    opt.textContent = `${cls.code} - ${cls.name}`;
    select.appendChild(opt);
  });
}

function fillForm(student) {
  const fields = [
    "student_code",
    "full_name",
    "gender",
    "birth_date",
    "email",
    "phone",
    "address",
    "hobbies",
    "class_id",
  ];

  fields.forEach((name) => {
    form.elements[name].value = student[name] ?? "";
  });

  originalAvatarUrl = student.avatar_url || originalAvatarUrl;
  setAvatarSrc(avatarPreview, originalAvatarUrl);

  (student.skills || []).forEach((skill) => addSkillRow(skill));
  (student.social_links || []).forEach((link) => addSocialRow(link));
}

// ── SỰ KIỆN & GỬI FORM ───────────────────────────────────────────────────────

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  avatarPreview.src = file ? URL.createObjectURL(file) : originalAvatarUrl;
});

document.getElementById("remove_avatar").addEventListener("change", (e) => {
  if (e.target.checked) {
    avatarInput.value = "";
    avatarPreview.src = "/uploads/default-avatar.png";
  } else {
    avatarPreview.src = originalAvatarUrl;
  }
});

document.getElementById("add-skill-btn").addEventListener("click", () => addSkillRow());
document.getElementById("add-social-btn").addEventListener("click", () => addSocialRow());

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminClearErrors(form);
  labelDynamicRows();

  const clientErrors = validateClient();
  if (clientErrors.length) {
    clientErrors.forEach((err) => adminShowError(err, form));
    const firstInvalid = form.querySelector(".input-invalid");
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const fd = new FormData(form);
  fd.set("student_code", fd.get("student_code").trim().toUpperCase());

  if (!fd.get("avatar") || fd.get("avatar").size === 0) {
    fd.delete("avatar");
  }

  // Luôn gửi cả hai khóa (kể cả "[]") để back-end đồng bộ danh sách
  fd.set("skills", JSON.stringify(readSkillRows()));
  fd.set("social_links", JSON.stringify(readSocialRows()));

  submitBtn.disabled = true;
  try {
    const url = isEdit ? `/api/students/${studentId}` : "/api/students";
    const method = isEdit ? "PUT" : "POST";

    await api(url, { method, body: fd });
    showStatus(isEdit ? "Đã lưu thay đổi" : "Đã thêm sinh viên", "success");
    setTimeout(() => {
      location.href = "/pages/admin-manage.html";
    }, 800);
  } catch (err) {
    adminShowError(err, form);
    submitBtn.disabled = false;
  }
});

// ── KHỞI TẠO TRANG ───────────────────────────────────────────────────────────

(async function init() {
  const me = await requireLogin("admin");
  if (!me) return;

  initAdminNav(me);

  if (isEdit) {
    document.getElementById("form-title").textContent = "Sửa sinh viên";
    document.title = "Sửa sinh viên";
    document.getElementById("remove-avatar-group").hidden = false;
  }

  showStatus("Đang tải...", "info");
  form.hidden = true;

  try {
    await loadClassOptions();
    if (isEdit) {
      const student = await api(`/api/students/${encodeURIComponent(studentId)}`);
      fillForm(student);
    }
    hideStatus();
    form.hidden = false;
  } catch (err) {
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
  }
})();
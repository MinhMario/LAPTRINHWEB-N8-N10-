// form.js - thêm (form.html) / sửa (form.html?id=X) sinh viên. Gửi FormData, KHÔNG tự đặt Content-Type.
const STUDENT_CODE_RE = /^[A-Z]\d{2}[A-Z]{4}\d{3}$/;
const PHONE_RE = /^0\d{9}$/;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PLATFORMS = ["Facebook", "GitHub", "LinkedIn"]; // ngoài các mục này -> "Khác" + ô nhập tên

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

// ---------- Hàng kỹ năng ----------
function addSkillRow(skill = { name: "", level: 3 }) {
  const row = document.createElement("div");
  row.className = "admin-row skill-edit-row";

  const nameCell = document.createElement("div");
  nameCell.className = "row-cell";
  const name = document.createElement("input");
  name.type = "text";
  name.className = "form-control skill-edit-name";
  name.maxLength = 50;
  name.placeholder = "Tên kỹ năng";
  name.setAttribute("list", "skill-suggestions");
  name.setAttribute("aria-label", "Tên kỹ năng");
  name.value = skill.name || "";
  name.addEventListener("input", debounce(() => suggestSkills(name.value.trim()), 300));
  const nameErr = document.createElement("span");
  nameErr.className = "field-error skill-edit-name-error";
  nameCell.append(name, nameErr);

  const levelCell = document.createElement("div");
  levelCell.className = "row-cell";
  const level = document.createElement("select");
  level.className = "form-select skill-edit-level";
  level.setAttribute("aria-label", "Mức kỹ năng");
  for (let i = 1; i <= 5; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${i}/5`;
    level.appendChild(opt);
  }
  level.value = String(skill.level || 3);
  const levelErr = document.createElement("span");
  levelErr.className = "field-error skill-edit-level-error";
  levelCell.append(level, levelErr);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn btn-danger btn-sm";
  remove.textContent = "Xóa hàng";
  remove.addEventListener("click", () => row.remove());

  row.append(nameCell, levelCell, remove);
  skillRows.appendChild(row);
}

// Gợi ý từ GET /api/skills?q=
async function suggestSkills(q) {
  if (!q) return;
  try {
    const list = await api(`/api/skills?q=${encodeURIComponent(q)}`);
    const dl = document.getElementById("skill-suggestions");
    dl.textContent = "";
    list.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.name;
      dl.appendChild(opt);
    });
  } catch { /* gợi ý là tính năng phụ, bỏ qua lỗi */ }
}

function readSkillRows() {
  const result = [];
  skillRows.querySelectorAll(".skill-edit-row").forEach((row) => {
    const name = row.querySelector(".skill-edit-name").value.trim();
    if (!name) return; // hàng trống không đưa vào mảng
    result.push({ name, level: Number(row.querySelector(".skill-edit-level").value) });
  });
  return result;
}

// ---------- Hàng mạng xã hội ----------
function addSocialRow(link = { platform: "Facebook", url: "" }) {
  const row = document.createElement("div");
  row.className = "admin-row social-row";

  const platCell = document.createElement("div");
  platCell.className = "row-cell";
  const select = document.createElement("select");
  select.className = "form-select social-platform";
  select.setAttribute("aria-label", "Nền tảng");
  [...PLATFORMS, "Khác"].forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
  });
  const custom = document.createElement("input");
  custom.type = "text";
  custom.className = "form-control social-custom";
  custom.maxLength = 30;
  custom.placeholder = "Tên nền tảng";
  custom.setAttribute("aria-label", "Tên nền tảng khác");
  const platErr = document.createElement("span");
  platErr.className = "field-error social-platform-error";
  platCell.append(select, custom, platErr);

  const isKnown = PLATFORMS.includes(link.platform);
  select.value = isKnown ? link.platform : "Khác";
  custom.value = isKnown ? "" : link.platform || "";
  custom.hidden = select.value !== "Khác";
  select.addEventListener("change", () => { custom.hidden = select.value !== "Khác"; });

  const urlCell = document.createElement("div");
  urlCell.className = "row-cell";
  const url = document.createElement("input");
  url.type = "text";
  url.className = "form-control social-url";
  url.maxLength = 255;
  url.placeholder = "https://...";
  url.setAttribute("aria-label", "Đường dẫn");
  url.value = link.url || "";
  const urlErr = document.createElement("span");
  urlErr.className = "field-error social-url-error";
  urlCell.append(url, urlErr);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn btn-danger btn-sm";
  remove.textContent = "Xóa hàng";
  remove.addEventListener("click", () => row.remove());

  row.append(platCell, urlCell, remove);
  socialRows.appendChild(row);
}

function platformOf(row) {
  const select = row.querySelector(".social-platform");
  return select.value === "Khác" ? row.querySelector(".social-custom").value.trim() : select.value;
}

function readSocialRows() {
  const result = [];
  socialRows.querySelectorAll(".social-row").forEach((row) => {
    const url = row.querySelector(".social-url").value.trim();
    const isOther = row.querySelector(".social-platform").value === "Khác";
    const platform = platformOf(row);
    if (!url && (!isOther || !platform)) return; // hàng trống hoàn toàn
    result.push({ platform, url });
  });
  return result;
}

// Gắn data-error-for theo chỉ số trong mảng ĐÃ LỌC hàng trống (khớp field như skills[1].level của back-end)
function labelDynamicRows() {
  let i = 0;
  skillRows.querySelectorAll(".skill-edit-row").forEach((row) => {
    if (!row.querySelector(".skill-edit-name").value.trim()) return;
    row.querySelector(".skill-edit-name-error").dataset.errorFor = `skills[${i}].name`;
    row.querySelector(".skill-edit-level-error").dataset.errorFor = `skills[${i}].level`;
    i++;
  });
  let j = 0;
  socialRows.querySelectorAll(".social-row").forEach((row) => {
    const url = row.querySelector(".social-url").value.trim();
    const isOther = row.querySelector(".social-platform").value === "Khác";
    if (!url && (!isOther || !platformOf(row))) return;
    row.querySelector(".social-platform-error").dataset.errorFor = `social_links[${j}].platform`;
    row.querySelector(".social-url-error").dataset.errorFor = `social_links[${j}].url`;
    j++;
  });
}

// ---------- Kiểm tra sớm phía client (back-end vẫn kiểm tra lại) ----------
function validateClient() {
  const errors = [];
  const v = (name) => form.elements[name].value.trim();
  const code = v("student_code").toUpperCase();
  if (!code) errors.push({ field: "student_code", error: "Vui lòng nhập mã sinh viên" });
  else if (!STUDENT_CODE_RE.test(code)) errors.push({ field: "student_code", error: "Mã sinh viên không đúng định dạng (VD: B24DTCN001)" });
  if (!v("full_name")) errors.push({ field: "full_name", error: "Vui lòng nhập họ tên" });
  if (!v("gender")) errors.push({ field: "gender", error: "Vui lòng chọn giới tính" });
  if (!v("birth_date")) errors.push({ field: "birth_date", error: "Vui lòng chọn ngày sinh" });
  else if (new Date(v("birth_date")) > new Date()) errors.push({ field: "birth_date", error: "Ngày sinh không được ở tương lai" });
  if (!v("email")) errors.push({ field: "email", error: "Vui lòng nhập email" });
  else if (!form.elements.email.checkValidity()) errors.push({ field: "email", error: "Email không đúng định dạng" });
  if (!v("phone")) errors.push({ field: "phone", error: "Vui lòng nhập số điện thoại" });
  else if (!PHONE_RE.test(v("phone"))) errors.push({ field: "phone", error: "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0" });
  if (!v("class_id")) errors.push({ field: "class_id", error: "Vui lòng chọn lớp" });

  const file = avatarInput.files[0];
  if (file) {
    if (!AVATAR_TYPES.includes(file.type) || file.size > MAX_AVATAR_SIZE) {
      errors.push({ field: "avatar", error: "Ảnh chỉ chấp nhận jpg, png, webp và tối đa 2MB" });
    }
  }
  return errors;
}

// ---------- Nạp dữ liệu ----------
async function loadClassOptions() {
  const classes = await api("/api/classes");
  const select = document.getElementById("class_id");
  classes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.code} - ${c.name}`;
    select.appendChild(opt);
  });
}

function fillForm(s) {
  ["student_code", "full_name", "gender", "birth_date", "email", "phone", "address", "hobbies", "class_id"].forEach((name) => {
    form.elements[name].value = s[name] ?? "";
  });
  originalAvatarUrl = s.avatar_url || originalAvatarUrl;
  avatarPreview.src = originalAvatarUrl;
  (s.skills || []).forEach((sk) => addSkillRow(sk));
  (s.social_links || []).forEach((l) => addSocialRow(l));
}

// ---------- Sự kiện ----------
avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  avatarPreview.src = file ? URL.createObjectURL(file) : originalAvatarUrl;
});

document.getElementById("remove_avatar").addEventListener("change", (e) => {
  if (e.target.checked) { avatarInput.value = ""; avatarPreview.src = "/uploads/default-avatar.png"; }
  else avatarPreview.src = originalAvatarUrl;
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
    const first = form.querySelector(".input-invalid");
    if (first) first.focus();
    return;
  }

  const fd = new FormData(form);
  fd.set("student_code", fd.get("student_code").trim().toUpperCase());
  if (!fd.get("avatar") || fd.get("avatar").size === 0) fd.delete("avatar");
  // Luôn gửi cả hai khóa (kể cả "[]") để back-end thay toàn bộ danh sách
  fd.set("skills", JSON.stringify(readSkillRows()));
  fd.set("social_links", JSON.stringify(readSocialRows()));

  submitBtn.disabled = true;
  try {
    await api(isEdit ? `/api/students/${studentId}` : "/api/students", {
      method: isEdit ? "PUT" : "POST",
      body: fd, // không đặt Content-Type
    });
    showStatus(isEdit ? "Đã lưu thay đổi" : "Đã thêm sinh viên", "success");
    setTimeout(() => { location.href = "/pages/admin-manage.html"; }, 800);
  } catch (err) {
    adminShowError(err, form);
    submitBtn.disabled = false;
  }
});

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
    if (isEdit) fillForm(await api(`/api/students/${encodeURIComponent(studentId)}`));
    hideStatus();
    form.hidden = false;
  } catch (err) {
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
  }
})();

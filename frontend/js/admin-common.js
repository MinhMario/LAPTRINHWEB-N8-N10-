// js/admin-common.js - hàm bổ sung RIÊNG cho 6 trang admin. Nạp SAU common.js.
// Không sửa file chung của An; những gì common.js của An đã có (getMe, requireLogin, renderNavbar,
// renderFooter, renderPagination, formatDateTime, escapeHtml, DEFAULT_AVATAR...) được dùng lại nguyên.

function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Thông báo trạng thái ở #status-message (đang tải / rỗng / lỗi / thành công)
function showStatus(message, type = "info") {
  const el = document.getElementById("status-message");
  if (!el) return;
  el.textContent = message;
  el.className = `status-message status-${type}`;
  el.hidden = false;
}

function hideStatus() {
  const el = document.getElementById("status-message");
  if (el) { el.textContent = ""; el.hidden = true; }
}

// Ảnh lỗi -> ảnh mặc định (DEFAULT_AVATAR nằm trong common.js)
function bindAvatarFallback(img) {
  img.addEventListener("error", () => {
    if (img.src !== DEFAULT_AVATAR) img.src = DEFAULT_AVATAR;
  });
}

// Xóa lỗi trong một vùng (form hoặc modal): lỗi từng ô, viền đỏ, hộp lỗi chung (.form-error)
function adminClearErrors(scope = document) {
  scope.querySelectorAll(".field-error").forEach((el) => { el.textContent = ""; });
  scope.querySelectorAll(".input-invalid").forEach((el) => el.classList.remove("input-invalid"));
  scope.querySelectorAll(".form-error").forEach((box) => { box.textContent = ""; box.classList.remove("visible"); });
}

// err = { error, field }. field có giá trị -> hiện dưới ô (kể cả skills[0].level);
// field = null -> hộp lỗi chung .form-error. Không tự viết lại thông báo, dùng đúng error của back-end.
function adminShowError(err, scope = document) {
  const msg = (err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại";
  if (err && err.field) {
    const span = scope.querySelector(`[data-error-for="${err.field}"]`);
    if (span) {
      span.textContent = msg;
      const input = scope.querySelector(`[name="${err.field}"]`)
        || (span.previousElementSibling && span.previousElementSibling.matches("input,select,textarea") ? span.previousElementSibling : null);
      if (input) input.classList.add("input-invalid");
      return;
    }
  }
  const box = scope.querySelector(".form-error");
  if (box) { box.textContent = msg; box.classList.add("visible"); }
  else showStatus(msg, "error");
}

// Menu + footer dùng chung của An (renderNavbar/renderFooter), thêm số "chờ duyệt" cạnh "Duyệt yêu cầu"
function initAdminNav(me) {
  renderNavbar(me);
  renderFooter();
  const page = location.pathname.split("/").pop();
  if (page === "admin-form.html") { // admin-form.html thuộc nhóm "Sinh viên"
    const manage = document.querySelector('.nav-menu a[href="/pages/admin-manage.html"]');
    if (manage) manage.classList.add("active");
  }
  const link = document.querySelector('.nav-menu a[href="/pages/admin-requests.html"]');
  if (link && !document.getElementById("pending-badge")) {
    const badge = document.createElement("span");
    badge.id = "pending-badge";
    badge.className = "menu-badge";
    badge.hidden = true;
    link.append(" ", badge);
  }
  refreshPendingBadge();
}

async function refreshPendingBadge() {
  const badge = document.getElementById("pending-badge");
  if (!badge) return;
  try {
    const stats = await api("/api/stats");
    badge.textContent = stats.pending_requests;
    badge.hidden = !stats.pending_requests;
  } catch { badge.hidden = true; }
}

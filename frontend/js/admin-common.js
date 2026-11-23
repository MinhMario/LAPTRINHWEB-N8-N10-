/**
 * js/admin-common.js - Các hàm tiện ích dùng riêng cho 6 trang Admin.
 * Nạp SAU js/common.js để tái sử dụng getMe, requireLogin, renderNavbar, renderFooter...
 */

// ── TIỆN ÍCH CHUNG ────────────────────────────────────────────────────────────

function debounce(fn, ms = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

/** Hiện ảnh mặc định nếu ảnh đại diện bị lỗi (gán src qua setAvatarSrc nếu cần set src sau đó) */
function bindAvatarFallback(img) {
  img.onerror = () => {
    handleAvatarError(img);
  };
}

// ── THÔNG BÁO TRẠNG THÁI & LỖI FORM ────────────────────────────────────────────

/** Hiển thị thông báo ở #status-message (info / success / error / empty) */
function showStatus(message, type = "info") {
  const el = document.getElementById("status-message");
  if (!el) return;
  el.textContent = message;
  el.className = `status-message status-${type}`;
  el.hidden = false;
}

function hideStatus() {
  const el = document.getElementById("status-message");
  if (!el) return;
  el.textContent = "";
  el.hidden = true;
}

/** Xóa toàn bộ thông báo lỗi cũ trong một form hoặc modal */
function adminClearErrors(scope = document) {
  scope.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
  });
  scope.querySelectorAll(".input-invalid").forEach((el) => {
    el.classList.remove("input-invalid");
  });
  scope.querySelectorAll(".form-error").forEach((box) => {
    box.textContent = "";
    box.classList.remove("visible");
  });
}

/**
 * Hiển thị lỗi trả về từ API ({ error, field }):
 * - Có field -> hiện ngay dưới ô nhập tương ứng (kể cả skills[0].level)
 * - Không có field -> hiện ở hộp lỗi chung .form-error
 */
function adminShowError(err, scope = document) {
  const msg = (err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại";

  if (err && err.field) {
    const span = scope.querySelector(`[data-error-for="${err.field}"]`);
    if (span) {
      span.textContent = msg;
      const prev = span.previousElementSibling;
      const input =
        scope.querySelector(`[name="${err.field}"]`) ||
        (prev && prev.matches("input, select, textarea") ? prev : null);
      if (input) {
        input.classList.add("input-invalid");
      }
      return;
    }
  }

  const box = scope.querySelector(".form-error");
  if (box) {
    box.textContent = msg;
    box.classList.add("visible");
  } else {
    showStatus(msg, "error");
  }
}

// ── THANH ĐIỀU HƯỚNG ADMIN & BADGE YÊU CẦU CHỜ DUYỆT ─────────────────────────

function initAdminNav(me) {
  renderNavbar(me);
  renderFooter();

  // Trang thêm/sửa sinh viên sáng chung mục "Sinh viên"
  const page = location.pathname.split("/").pop();
  if (page === "admin-form.html") {
    const manageLink = document.querySelector('.nav-menu a[href="/pages/admin-manage.html"]');
    if (manageLink) {
      manageLink.classList.add("active");
    }
  }

  // Gắn số lượng yêu cầu đang chờ duyệt cạnh mục "Duyệt yêu cầu"
  const requestsLink = document.querySelector('.nav-menu a[href="/pages/admin-requests.html"]');
  if (requestsLink && !document.getElementById("pending-badge")) {
    const badge = document.createElement("span");
    badge.id = "pending-badge";
    badge.className = "menu-badge";
    badge.hidden = true;
    requestsLink.append(" ", badge);
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
  } catch {
    badge.hidden = true;
  }
}
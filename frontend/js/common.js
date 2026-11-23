/**
 * js/common.js - Các hàm dùng chung toàn hệ thống
 * Tuân thủ theo FRONTEND_GUIDE.md mục 3, 4, 7, 8, 9
 */

// Ảnh đại diện mặc định dưới dạng SVG data URI an toàn tuyệt đối khi chưa có file /uploads/default-avatar.png
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23e2e8f0'/%3E%3Cpath d='M60 20a22 22 0 1 0 0 44 22 22 0 0 0 0-44zm0 54c-24.3 0-44 14.3-44 32v6h88v-6c0-17.7-19.7-32-44-32z' fill='%2394a3b8'/%3E%3C/svg%3E";

/**
 * Lấy thông tin người dùng hiện tại (không chuyển hướng nếu chưa đăng nhập)
 * @returns {Promise<Object|null>}
 */
async function getMe() {
  try {
    return await api("/api/me", { noRedirect: true });
  } catch {
    return null; // null = khách
  }
}

/**
 * Kiểm tra đăng nhập và phân quyền
 * @param {"admin"|"student"|undefined} role
 * @returns {Promise<Object|null>}
 */
async function requireLogin(role) {
  const me = await getMe();
  if (!me) {
    location.href = "/pages/login.html";
    return null;
  }

  const onChangePage = location.pathname.endsWith("/pages/change-password.html");
  if (me.must_change_password && !onChangePage) {
    location.href = "/pages/change-password.html";
    return null;
  }

  if (role && me.role !== role) {
    location.href = me.role === "admin" ? "/pages/admin-dashboard.html" : "/pages/profile.html";
    return null;
  }

  return me;
}

/**
 * Đăng xuất khỏi hệ thống
 */
async function logout() {
  try {
    await api("/api/logout", { method: "POST" });
  } catch (e) {
    console.warn("Lỗi khi gọi logout:", e);
  } finally {
    location.href = "/pages/login.html";
  }
}

/**
 * Hiển thị thanh điều hướng (Navbar) tự động dựa trên vai trò người dùng
 * @param {Object|null} me
 */
function renderNavbar(me) {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const currentPath = location.pathname.split("/").pop() || "index.html";

  let menuItemsHtml = `
    <li><a href="/index.html" class="nav-link ${currentPath === "index.html" ? "active" : ""}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
      Trang chủ
    </a></li>
  `;

  let userSectionHtml = "";

  if (!me) {
    // Khách chưa đăng nhập
    userSectionHtml = `
      <div class="nav-user">
        <a href="/pages/login.html" class="btn btn-primary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          Đăng nhập
        </a>
      </div>
    `;
  } else if (me.role === "student") {
    // Sinh viên
    menuItemsHtml += `
      <li><a href="/pages/profile.html" class="nav-link ${currentPath === "profile.html" || currentPath === "profile-edit.html" ? "active" : ""}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        Hồ sơ của tôi
      </a></li>
      <li><a href="/pages/change-password.html" class="nav-link ${currentPath === "change-password.html" ? "active" : ""}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        Đổi mật khẩu
      </a></li>
    `;

    userSectionHtml = `
      <div class="nav-user">
        <span class="nav-user-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          ${escapeHtml(me.username)}
        </span>
        <button id="nav-logout-btn" class="btn btn-outline btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Đăng xuất
        </button>
      </div>
    `;
  } else if (me.role === "admin") {
    // Admin
    menuItemsHtml += `
      <li><a href="/pages/admin-dashboard.html" class="nav-link ${currentPath === "admin-dashboard.html" ? "active" : ""}">Dashboard</a></li>
      <li><a href="/pages/admin-manage.html" class="nav-link ${currentPath === "admin-manage.html" ? "active" : ""}">Sinh viên</a></li>
      <li><a href="/pages/admin-classes.html" class="nav-link ${currentPath === "admin-classes.html" ? "active" : ""}">Lớp & ngành</a></li>
      <li><a href="/pages/admin-requests.html" class="nav-link ${currentPath === "admin-requests.html" ? "active" : ""}">Duyệt yêu cầu</a></li>
      <li><a href="/pages/admin-audit.html" class="nav-link ${currentPath === "admin-audit.html" ? "active" : ""}">Nhật ký</a></li>
    `;

    userSectionHtml = `
      <div class="nav-user">
        <span class="nav-user-badge" style="background:#e0f2fe; color:#0369a1;">
          Admin: ${escapeHtml(me.username)}
        </span>
        <button id="nav-logout-btn" class="btn btn-outline btn-sm">Đăng xuất</button>
      </div>
    `;
  }

  header.innerHTML = `
    <div class="navbar-container">
      <a href="/index.html" class="brand-logo">
        <div class="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
        </div>
        <span>PTIT StudentHub</span>
      </a>

      <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>

      <ul class="nav-menu" id="nav-menu">
        ${menuItemsHtml}
        ${userSectionHtml}
      </ul>
    </div>
  `;

  // Gắn sự kiện nút đăng xuất
  const logoutBtn = document.getElementById("nav-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  // Gắn sự kiện menu mobile
  const hamburgerBtn = document.getElementById("nav-hamburger");
  const navMenu = document.getElementById("nav-menu");
  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener("click", () => {
      navMenu.classList.toggle("open");
    });
  }
}

/**
 * Hiển thị Footer chuẩn
 */
function renderFooter() {
  const footer = document.querySelector(".site-footer");
  if (!footer) return;
  footer.innerHTML = `
    <div class="footer-content">
      <div>
        <strong>Hệ thống Quản lý & Giới thiệu Hồ sơ Sinh viên</strong>
        <p style="margin-top: 4px; font-size: 0.82rem; color: #94a3b8;">Học viện Công nghệ Bưu chính Viễn thông (PTIT) &bull; Thiết kế & phát triển bởi Thanh An</p>
      </div>
      <div style="font-size: 0.82rem;">
        &copy; 2026 PTIT StudentHub. All rights reserved.
      </div>
    </div>
  `;
}

/**
 * Xóa thông báo lỗi cũ trên form
 * @param {HTMLFormElement} form
 */
function clearErrors(form) {
  if (!form) return;
  const errorSpans = form.querySelectorAll(".field-error");
  errorSpans.forEach(span => {
    span.textContent = "";
  });

  const invalidInputs = form.querySelectorAll(".input-invalid");
  invalidInputs.forEach(input => {
    input.classList.remove("input-invalid");
  });

  const formError = document.getElementById("form-error");
  if (formError) {
    formError.textContent = "";
    formError.classList.remove("visible");
  }
}

/**
 * Hiển thị lỗi trả về từ API theo đúng quy ước FRONTEND_GUIDE mục 7
 * @param {Object} err { error: string, field: string|null, code?: string }
 * @param {HTMLFormElement} form
 */
function showErrors(err, form) {
  if (!err) return;

  if (err.field) {
    // Tìm span lỗi theo tên trường
    const errorSpan = form ? form.querySelector(`[data-error-for="${err.field}"]`) : document.querySelector(`[data-error-for="${err.field}"]`);
    if (errorSpan) {
      errorSpan.textContent = err.error || "Dữ liệu không hợp lệ";
    }

    // Đánh dấu ô input tương ứng
    const input = form ? form.querySelector(`[name="${err.field}"], #${err.field}`) : document.getElementById(err.field);
    if (input) {
      input.classList.add("input-invalid");
      input.focus();
    }
  } else {
    // Lỗi chung (field = null)
    showFormError(err.error || "Đã xảy ra lỗi, vui lòng thử lại");
  }
}

/**
 * Hiển thị lỗi chung ở #form-error
 * @param {string} message
 */
function showFormError(message) {
  const formError = document.getElementById("form-error");
  if (formError) {
    formError.textContent = message;
    formError.classList.add("visible");
  } else {
    showToast(message, "danger");
  }
}

/**
 * Định dạng ngày (dd/mm/yyyy)
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

/**
 * Định dạng ngày giờ (dd/mm/yyyy HH:mm)
 * @param {string} isoString
 * @returns {string}
 */
function formatDateTime(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

/**
 * Chống tấn công XSS an toàn
 * @param {any} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Tạo các chấm đánh giá kỹ năng 1-5 sao
 * @param {number} level
 * @returns {string}
 */
function renderSkillDots(level) {
  const lvl = Math.max(1, Math.min(5, Number(level) || 1));
  const labels = ["", "Cơ bản", "Sơ cấp", "Trung bình", "Khá", "Thành thạo"];
  let dotsHtml = "";
  for (let i = 1; i <= 5; i++) {
    dotsHtml += `<span class="skill-dot ${i <= lvl ? "active" : ""}"></span>`;
  }
  return `
    <div class="skill-meter" title="${labels[lvl]} (${lvl}/5)">
      ${dotsHtml}
      <span class="skill-level-text">${labels[lvl]}</span>
    </div>
  `;
}

/**
 * Hiển thị thanh phân trang chuẩn
 * @param {HTMLElement} container
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {Function} onPageChange
 */
function renderPagination(container, currentPage, totalPages, onPageChange) {
  if (!container) return;
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <div class="pagination-info">
      Trang <strong>${currentPage}</strong> / <strong>${totalPages}</strong>
    </div>
    <div class="pagination-controls">
      <button class="page-btn" id="pg-first" ${currentPage <= 1 ? "disabled" : ""} title="Trang đầu">&laquo;</button>
      <button class="page-btn" id="pg-prev" ${currentPage <= 1 ? "disabled" : ""} title="Trang trước">&lsaquo;</button>
  `;

  // Tính toán khoảng trang hiển thị (tối đa 5 nút số)
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="page-btn ${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>
    `;
  }

  html += `
      <button class="page-btn" id="pg-next" ${currentPage >= totalPages ? "disabled" : ""} title="Trang sau">&rsaquo;</button>
      <button class="page-btn" id="pg-last" ${currentPage >= totalPages ? "disabled" : ""} title="Trang cuối">&raquo;</button>
    </div>
  `;

  container.innerHTML = html;

  // Gắn sự kiện click
  const firstBtn = container.querySelector("#pg-first");
  if (firstBtn) firstBtn.onclick = () => onPageChange(1);

  const prevBtn = container.querySelector("#pg-prev");
  if (prevBtn) prevBtn.onclick = () => onPageChange(currentPage - 1);

  const nextBtn = container.querySelector("#pg-next");
  if (nextBtn) nextBtn.onclick = () => onPageChange(currentPage + 1);

  const lastBtn = container.querySelector("#pg-last");
  if (lastBtn) lastBtn.onclick = () => onPageChange(totalPages);

  container.querySelectorAll(".page-btn[data-page]").forEach(btn => {
    btn.onclick = () => {
      const p = parseInt(btn.getAttribute("data-page"), 10);
      if (p !== currentPage) onPageChange(p);
    };
  });
}

/**
 * Hiển thị thông báo Toast góc trên bên phải
 * @param {string} message
 * @param {"success"|"danger"|"warning"|"info"} type
 */
function showToast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Xử lý ảnh avatar lỗi, tự động thay bằng avatar mặc định
 * @param {HTMLImageElement} img
 */
function handleAvatarError(img) {
  img.onerror = null;
  if (img.src !== DEFAULT_AVATAR) {
    img.src = DEFAULT_AVATAR;
  }
}

/**
 * Gán ảnh đại diện an toàn: đăng ký onerror TRƯỚC khi set src, để ảnh 404
 * (ví dụ file không còn trên đĩa) vẫn tự chuyển sang avatar mặc định.
 * Dùng cho mọi <img> avatar cần gán src bằng JS.
 * @param {HTMLImageElement} img
 * @param {string|null|undefined} url
 */
function setAvatarSrc(img, url) {
  img.onerror = () => handleAvatarError(img);
  img.src = url || DEFAULT_AVATAR;
  // Ảnh có thể đã lỗi trước khi listener được gắn (HTML parse xong, ảnh 404 rất nhanh)
  if (img.complete && img.naturalWidth === 0 && img.src !== DEFAULT_AVATAR) {
    handleAvatarError(img);
  }
}

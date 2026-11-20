/**
 * js/login.js - Xử lý logic Đăng nhập
 * Tuân thủ theo FRONTEND_GUIDE.md mục 1, 3, 4, 7 và API.md mục 6.1
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Kiểm tra nếu đã đăng nhập từ trước
  const me = await getMe();
  if (me) {
    if (me.must_change_password) {
      location.href = "change-password.html";
      return;
    }
    location.href = me.role === "admin" ? "dashboard.html" : "profile.html";
    return;
  }

  renderNavbar(null);
  renderFooter();

  const form = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const submitBtn = document.getElementById("btn-submit");
  const togglePassBtn = document.getElementById("btn-toggle-password");

  // 2. Ẩn / hiện mật khẩu
  if (togglePassBtn) {
    togglePassBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      togglePassBtn.textContent = isPassword ? "🙈" : "👁️";
    });
  }

  // 3. Xử lý các nút bấm điền tài khoản mẫu
  const sampleBtns = document.querySelectorAll(".sample-btn");
  sampleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      clearErrors(form);
      usernameInput.value = btn.getAttribute("data-user");
      passwordInput.value = btn.getAttribute("data-pass");
      usernameInput.focus();
    });
  });

  // 4. Bắt sự kiện gửi form đăng nhập
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    let hasLocalError = false;
    if (!username) {
      showErrors({ field: "username", error: "Vui lòng nhập tên đăng nhập hoặc mã SV" }, form);
      hasLocalError = true;
    }
    if (!password) {
      showErrors({ field: "password", error: "Vui lòng nhập mật khẩu" }, form);
      hasLocalError = true;
    }
    if (hasLocalError) return;

    // Vô hiệu hóa nút trong khi đang gửi
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <div class="spinner" style="width: 16px; height: 16px; border-width: 2px; margin: 0; vertical-align: middle;"></div>
      Đang xác thực...
    `;

    try {
      // noRedirect: true để trang login tự xử lý hiển thị lỗi, không bị chuyển hướng
      const data = await api("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        noRedirect: true
      });

      showToast("Đăng nhập thành công!", "success");

      // Chuyển hướng theo đúng thứ tự ưu tiên của FRONTEND_GUIDE mục 3
      setTimeout(() => {
        if (data.must_change_password) {
          location.href = "change-password.html";
        } else if (data.role === "admin") {
          location.href = "dashboard.html";
        } else {
          location.href = "profile.html";
        }
      }, 300);

    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;

      // Trang login hiển thị đúng lỗi trả về từ backend (401, 403 ACCOUNT_LOCKED...)
      showErrors(err, form);
    }
  });
});

/**
 * js/change-password.js - Xử lý logic Đổi mật khẩu
 * Tuân thủ theo FRONTEND_GUIDE.md mục 1, 3, 4, 7 và API.md mục 5.4, 6.1
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Kiểm tra bắt buộc đăng nhập (bất kể vai trò nào)
  const me = await requireLogin();
  if (!me) return;

  renderNavbar(me);
  renderFooter();

  // Hiển thị cảnh báo nếu tài khoản đang bị buộc đổi mật khẩu
  if (me.must_change_password) {
    const alertBox = document.getElementById("first-login-alert");
    if (alertBox) alertBox.style.display = "flex";
  }

  const form = document.getElementById("password-form");
  const currentPassInput = document.getElementById("current_password");
  const newPassInput = document.getElementById("new_password");
  const confirmPassInput = document.getElementById("confirm_password");
  const submitBtn = document.getElementById("btn-submit");

  // 2. Bắt sự kiện gửi form đổi mật khẩu
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);

    const current_password = currentPassInput.value;
    const new_password = newPassInput.value;
    const confirm_password = confirmPassInput.value;

    let hasLocalError = false;

    if (!current_password) {
      showErrors({ field: "current_password", error: "Vui lòng nhập mật khẩu hiện tại" }, form);
      hasLocalError = true;
    }

    if (!new_password) {
      showErrors({ field: "new_password", error: "Vui lòng nhập mật khẩu mới" }, form);
      hasLocalError = true;
    } else if (new_password.length < 8) {
      showErrors({ field: "new_password", error: "Mật khẩu mới phải có ít nhất 8 ký tự" }, form);
      hasLocalError = true;
    } else if (new_password === current_password) {
      showErrors({ field: "new_password", error: "Mật khẩu mới phải khác mật khẩu hiện tại" }, form);
      hasLocalError = true;
    }

    if (confirm_password !== new_password) {
      showErrors({ field: "confirm_password", error: "Xác nhận mật khẩu mới không khớp" }, form);
      hasLocalError = true;
    }

    if (hasLocalError) return;

    // Vô hiệu hóa nút trong khi đang gửi
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <div class="spinner" style="width: 16px; height: 16px; border-width: 2px; margin: 0; vertical-align: middle;"></div>
      Đang cập nhật...
    `;

    try {
      await api("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password, new_password })
      });

      showToast("Đổi mật khẩu thành công!", "success");

      // Chuyển hướng tới trang chính theo vai trò
      setTimeout(() => {
        location.href = me.role === "admin" ? "dashboard.html" : "profile.html";
      }, 800);

    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      showErrors(err, form);
    }
  });
});

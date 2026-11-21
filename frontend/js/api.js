/**
 * js/api.js - Hàm gọi API dùng chung
 * Tuân thủ theo FRONTEND_GUIDE.md mục 3
 */

async function api(url, options = {}) {
  const { noRedirect, ...fetchOptions } = options;
  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch {
    throw { error: "Không thể kết nối máy chủ, vui lòng thử lại", field: null };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* file hoặc nội dung rỗng */
  }

  if (res.status === 401 && !noRedirect) {
    location.href = "/pages/login.html";
    throw data;
  }

  if (res.status === 403 && data && data.code === "MUST_CHANGE_PASSWORD") {
    if (!location.pathname.endsWith("/pages/change-password.html")) {
      location.href = "/pages/change-password.html";
    }
    throw data;
  }

  if (!res.ok) {
    throw data || { error: "Có lỗi xảy ra", field: null };
  }

  return data;
}

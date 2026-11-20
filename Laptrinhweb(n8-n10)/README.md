# Hướng dẫn Front-end & Quy ước dự án

Xem tài liệu chi tiết quy ước tại API.md và FRONTEND_GUIDE.md được quy định bởi nhóm:
- Nhánh `feature/thanh-an-user-pages` phụ trách:
  - `index.html` + `js/index.js`: Trang chủ danh sách sinh viên dạng lưới + tìm kiếm, lọc, phân trang, sắp xếp.
  - `detail.html` + `js/detail.js`: Trang chi tiết 2 cột (ảnh, thông tin, sở thích, kỹ năng, mạng xã hội).
  - `login.html` + `js/login.js`: Trang đăng nhập, xử lý 401, 403 (khóa TK), điều hướng theo vai trò.
  - `change-password.html` + `js/change-password.js`: Trang đổi mật khẩu (bắt buộc lần đầu / tự đổi).
  - `profile.html` + `js/profile.js`: Trang xem hồ sơ cá nhân sinh viên & lịch sử yêu cầu cập nhật.
  - `profile-edit.html` + `js/profile-edit.js`: Trang sinh viên gửi yêu cầu cập nhật thông tin (chỉ gửi trường thay đổi, kỹ năng/mạng xã hội động).
  - `css/style.css`: Hệ thống CSS thiết kế hiện đại, responsive, biến màu chuẩn, micro-interactions.
  - `js/api.js`: Hàm gọi API dùng chung, xử lý 401/403 tự động.
  - `js/common.js`: Các hàm tiện ích dùng chung (getMe, requireLogin, renderNavbar, renderFooter, validate, format, toast).

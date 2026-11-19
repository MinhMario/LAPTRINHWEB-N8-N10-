/**
 * js/index.js - Xử lý logic Trang chủ danh sách sinh viên
 * Tuân thủ theo FRONTEND_GUIDE.md mục 1, 3, 4, 8, 9
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Kiểm tra trạng thái đăng nhập và nạp thanh điều hướng
  const me = await getMe();
  renderNavbar(me);
  renderFooter();

  // 2. Các phần tử DOM
  const searchInput = document.getElementById("search-input");
  const majorFilter = document.getElementById("major-filter");
  const classFilter = document.getElementById("class-filter");
  const sortSelect = document.getElementById("sort-select");
  const studentGrid = document.getElementById("student-grid");
  const paginationContainer = document.getElementById("pagination");
  const statusMessage = document.getElementById("status-message");

  // Biến trạng thái phân trang
  let currentPage = 1;
  const pageSize = 12; // Cỡ trang theo FRONTEND_GUIDE mục 8: User 12
  let debounceTimeout = null;

  // 3. Nạp danh sách ngành và lớp ban đầu
  await Promise.all([loadMajors(), loadClasses()]);

  // 4. Nạp danh sách sinh viên lần đầu
  await loadStudents();

  // 5. Gắn sự kiện lắng nghe bộ lọc và tìm kiếm

  // Tìm kiếm với Debounce 300ms
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      currentPage = 1;
      loadStudents();
    }, 300);
  });

  // Thay đổi ngành -> nạp lại lớp của ngành đó rồi tải lại dữ liệu
  majorFilter.addEventListener("change", async () => {
    const selectedMajorId = majorFilter.value;
    await loadClasses(selectedMajorId);
    currentPage = 1;
    await loadStudents();
  });

  // Thay đổi lớp
  classFilter.addEventListener("change", () => {
    currentPage = 1;
    loadStudents();
  });

  // Thay đổi sắp xếp
  sortSelect.addEventListener("change", () => {
    currentPage = 1;
    loadStudents();
  });

  /**
   * Tải danh mục ngành
   */
  async function loadMajors() {
    try {
      const majors = await api("/api/majors");
      if (Array.isArray(majors)) {
        majorFilter.innerHTML = '<option value="">-- Tất cả ngành --</option>';
        majors.forEach(m => {
          const opt = document.createElement("option");
          opt.value = m.id;
          opt.textContent = `${m.code} - ${m.name}`;
          majorFilter.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn("Không thể tải danh sách ngành:", e);
    }
  }

  /**
   * Tải danh mục lớp (có thể lọc theo ngành)
   * @param {string|number} majorId
   */
  async function loadClasses(majorId = "") {
    try {
      const url = majorId ? `/api/classes?major_id=${encodeURIComponent(majorId)}` : "/api/classes";
      const classes = await api(url);
      if (Array.isArray(classes)) {
        classFilter.innerHTML = '<option value="">-- Tất cả lớp --</option>';
        classes.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = `${c.code} - ${c.name}`;
          classFilter.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn("Không thể tải danh sách lớp:", e);
    }
  }

  /**
   * Gọi API lấy danh sách sinh viên và render
   */
  async function loadStudents() {
    // Trạng thái đang tải
    statusMessage.style.display = "block";
    statusMessage.innerHTML = `
      <div class="spinner"></div>
      <h3>Đang tải danh sách sinh viên...</h3>
      <p>Vui lòng chờ trong giây lát</p>
    `;
    studentGrid.innerHTML = "";
    paginationContainer.innerHTML = "";

    const query = searchInput.value.trim();
    const majorId = majorFilter.value;
    const classId = classFilter.value;
    const sort = sortSelect.value;

    const params = new URLSearchParams({
      page: currentPage,
      page_size: pageSize,
      sort: sort
    });

    if (query) params.append("q", query);
    if (majorId) params.append("major_id", majorId);
    if (classId) params.append("class_id", classId);

    try {
      const data = await api(`/api/students?${params.toString()}`);

      if (!data || !data.items || data.items.length === 0) {
        statusMessage.style.display = "block";
        statusMessage.innerHTML = `
          <div class="status-icon">🔍</div>
          <h3>Không có kết quả</h3>
          <p>Không tìm thấy sinh viên nào phù hợp với bộ lọc hiện tại.</p>
        `;
        return;
      }

      // Ẩn thông báo trạng thái khi có dữ liệu
      statusMessage.style.display = "none";

      // Render danh sách thẻ sinh viên
      renderStudentCards(data.items);

      // Render phân trang
      renderPagination(paginationContainer, data.page, data.total_pages, (newPage) => {
        currentPage = newPage;
        loadStudents();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

    } catch (err) {
      statusMessage.style.display = "block";
      statusMessage.innerHTML = `
        <div class="status-icon" style="color: var(--color-danger);">⚠️</div>
        <h3>Không thể tải dữ liệu</h3>
        <p>${escapeHtml(err.error || "Không thể kết nối máy chủ, vui lòng thử lại")}</p>
      `;
    }
  }

  /**
   * Tạo các card sinh viên
   * @param {Array} students
   */
  function renderStudentCards(students) {
    studentGrid.innerHTML = "";

    students.forEach(student => {
      const card = document.createElement("div");
      card.className = "student-card";

      const avatarSrc = student.avatar_url || DEFAULT_AVATAR;
      const genderIcon = student.gender === "Nữ" ? "♀️" : "♂️";

      card.innerHTML = `
        <div class="student-card-header">
          <img 
            src="${escapeHtml(avatarSrc)}" 
            alt="${escapeHtml(student.full_name)}" 
            class="student-avatar"
            onerror="handleAvatarError(this)"
            loading="lazy"
          >
          <div class="student-basic-info">
            <h3 class="student-name" title="${escapeHtml(student.full_name)}">${escapeHtml(student.full_name)}</h3>
            <span class="student-code-badge">${escapeHtml(student.student_code)}</span>
          </div>
        </div>

        <div class="student-card-body">
          <div class="info-item">
            <span class="info-icon">🏫</span>
            <span class="info-text" title="${escapeHtml(student.class_code)} - ${escapeHtml(student.class_name)}">
              <strong>${escapeHtml(student.class_code)}</strong> &bull; ${escapeHtml(student.class_name)}
            </span>
          </div>

          <div class="info-item">
            <span class="info-icon">📚</span>
            <span class="info-text">${escapeHtml(student.major_name || "Chưa cập nhật")}</span>
          </div>

          <div class="info-item">
            <span class="info-icon">${genderIcon}</span>
            <span class="info-text">Giới tính: ${escapeHtml(student.gender || "—")}</span>
          </div>

          ${student.email ? `
            <div class="info-item">
              <span class="info-icon">✉️</span>
              <span class="info-text" title="${escapeHtml(student.email)}">${escapeHtml(student.email)}</span>
            </div>
          ` : ""}
        </div>

        <div class="student-card-footer">
          <span style="font-size: 0.82rem; color: var(--color-text-muted);">PTIT Student</span>
          <a href="detail.html?id=${student.id}" class="btn btn-primary btn-sm">
            Xem chi tiết
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </a>
        </div>
      `;

      studentGrid.appendChild(card);
    });
  }
});

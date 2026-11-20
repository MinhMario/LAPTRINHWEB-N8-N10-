/**
 * js/detail.js - Xử lý logic Trang chi tiết sinh viên 2 cột
 * Tuân thủ theo FRONTEND_GUIDE.md mục 1, 3, 4, 9 và API.md mục 4.1
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Kiểm tra đăng nhập và nạp thanh điều hướng
  const me = await getMe();
  renderNavbar(me);
  renderFooter();

  const statusMessage = document.getElementById("status-message");
  const detailContainer = document.getElementById("student-detail");

  // 2. Lấy tham số id từ URL
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("id");

  if (!studentId) {
    statusMessage.style.display = "block";
    statusMessage.innerHTML = `
      <div class="status-icon">⚠️</div>
      <h3>Không tìm thấy sinh viên</h3>
      <p>Tham số ID không hợp lệ hoặc thiếu trên đường dẫn.</p>
      <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">Về trang chủ</a>
    `;
    return;
  }

  // 3. Tải dữ liệu chi tiết sinh viên từ API
  await loadStudentDetail(studentId, me);

  /**
   * Tải dữ liệu chi tiết sinh viên
   * @param {string|number} id
   * @param {Object|null} currentUser
   */
  async function loadStudentDetail(id, currentUser) {
    statusMessage.style.display = "block";
    statusMessage.innerHTML = `
      <div class="spinner"></div>
      <h3>Đang tải thông tin sinh viên...</h3>
      <p>Vui lòng chờ trong giây lát</p>
    `;
    detailContainer.style.display = "none";

    try {
      const student = await api(`/api/students/${encodeURIComponent(id)}`);
      if (!student) {
        throw { error: "Không tìm thấy sinh viên" };
      }

      statusMessage.style.display = "none";
      detailContainer.style.display = "grid";

      // 4. Render Cột 1 - Thẻ Profile Card
      const avatarImg = document.getElementById("detail-avatar");
      avatarImg.src = student.avatar_url || DEFAULT_AVATAR;
      avatarImg.alt = student.full_name;

      const genderBadge = document.getElementById("detail-gender-badge");
      genderBadge.textContent = student.gender === "Nữ" ? "♀️" : "♂️";
      genderBadge.title = `Giới tính: ${student.gender || "Chưa rõ"}`;

      document.getElementById("detail-name").textContent = student.full_name;
      document.getElementById("detail-code").textContent = student.student_code;
      document.getElementById("detail-class").textContent = `Lớp: ${student.class_code || "—"} (${student.class_name || "—"})`;
      document.getElementById("detail-major").textContent = `Ngành: ${student.major_name || "Chưa cập nhật"}`;

      // Xử lý nút tự sửa hồ sơ nếu người xem chính là sinh viên này
      const editSelfBtn = document.getElementById("btn-edit-self");
      if (currentUser && currentUser.role === "student" && currentUser.student_id === student.id) {
        editSelfBtn.style.display = "inline-flex";
      }

      // Xử lý nút chia sẻ liên kết
      const shareBtn = document.getElementById("btn-share");
      shareBtn.onclick = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showToast("Đã sao chép liên kết hồ sơ vào khay nhớ tạm!", "success");
        }).catch(() => {
          showToast("Không thể tự động sao chép liên kết", "warning");
        });
      };

      // Mạng xã hội
      const socialContainer = document.getElementById("detail-social-links");
      const socialSection = document.getElementById("detail-social-section");
      if (student.social_links && student.social_links.length > 0) {
        socialSection.style.display = "block";
        socialContainer.innerHTML = "";
        student.social_links.forEach(item => {
          if (!item.url) return;
          // Chỉ gắn vào href khi bắt đầu bằng http:// hoặc https:// (chống XSS)
          const safeUrl = (item.url.startsWith("http://") || item.url.startsWith("https://")) ? item.url : `https://${item.url}`;
          const link = document.createElement("a");
          link.href = safeUrl;
          link.className = "social-btn";
          link.target = "_blank";
          link.rel = "noopener noreferrer";

          let icon = "🔗";
          const lowerPlatform = (item.platform || "").toLowerCase();
          if (lowerPlatform.includes("facebook")) icon = "📘";
          else if (lowerPlatform.includes("github")) icon = "🐙";
          else if (lowerPlatform.includes("linkedin")) icon = "💼";
          else if (lowerPlatform.includes("twitter") || lowerPlatform.includes("x")) icon = "🐦";
          else if (lowerPlatform.includes("instagram")) icon = "📸";

          link.innerHTML = `<span>${icon}</span> <span>${escapeHtml(item.platform || "Liên kết")}</span>`;
          socialContainer.appendChild(link);
        });
      } else {
        socialSection.style.display = "none";
      }

      // 5. Render Cột 2 - Thông tin cá nhân
      const protectedHtml = '<span class="protected-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Được bảo mật</span>';

      document.getElementById("detail-birth-date").innerHTML = student.birth_date ? escapeHtml(formatDate(student.birth_date)) : protectedHtml;
      document.getElementById("detail-gender").textContent = student.gender || "—";
      document.getElementById("detail-email").innerHTML = student.email ? escapeHtml(student.email) : protectedHtml;
      document.getElementById("detail-phone").innerHTML = student.phone ? escapeHtml(student.phone) : protectedHtml;
      document.getElementById("detail-address").innerHTML = student.address ? escapeHtml(student.address) : (student.address === null ? protectedHtml : "—");
      document.getElementById("detail-created-at").textContent = formatDate(student.created_at);
      document.getElementById("detail-updated-at").textContent = student.updated_at ? formatDateTime(student.updated_at) : "Chưa chỉnh sửa";

      // 6. Kỹ năng chuyên môn
      const skillsCard = document.getElementById("detail-skills-card");
      const skillsList = document.getElementById("detail-skills-list");
      if (student.skills && student.skills.length > 0) {
        skillsCard.style.display = "block";
        skillsList.innerHTML = "";

        // Sắp xếp level giảm dần rồi theo tên
        const sortedSkills = [...student.skills].sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          return a.name.localeCompare(b.name);
        });

        sortedSkills.forEach(skill => {
          const row = document.createElement("div");
          row.className = "skill-row";
          row.innerHTML = `
            <span class="skill-name">${escapeHtml(skill.name)}</span>
            ${renderSkillDots(skill.level)}
          `;
          skillsList.appendChild(row);
        });
      } else {
        skillsCard.style.display = "none";
      }

      // 7. Sở thích
      const hobbiesCard = document.getElementById("detail-hobbies-card");
      const hobbiesContent = document.getElementById("detail-hobbies-content");
      if (student.hobbies && student.hobbies.trim() !== "") {
        hobbiesCard.style.display = "block";
        // Nếu các sở thích ngăn cách bằng dấu phẩy, hiển thị dạng tags sinh động
        const hobbiesArray = student.hobbies.split(",").map(h => h.trim()).filter(Boolean);
        if (hobbiesArray.length > 1) {
          let tagsHtml = `<div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
          hobbiesArray.forEach(hobby => {
            tagsHtml += `<span class="badge badge-neutral" style="font-size: 0.9rem; padding: 6px 12px;">🌟 ${escapeHtml(hobby)}</span>`;
          });
          tagsHtml += `</div>`;
          hobbiesContent.innerHTML = tagsHtml;
        } else {
          hobbiesContent.textContent = student.hobbies;
        }
      } else {
        hobbiesCard.style.display = "none";
      }

      // Cập nhật tiêu đề tab trình duyệt
      document.title = `${student.full_name} | PTIT StudentHub`;

    } catch (err) {
      statusMessage.style.display = "block";
      statusMessage.innerHTML = `
        <div class="status-icon" style="color: var(--color-danger);">⚠️</div>
        <h3>Không tìm thấy sinh viên</h3>
        <p>${escapeHtml(err.error || "Hồ sơ sinh viên này không tồn tại hoặc đã bị xóa.")}</p>
        <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">Về trang chủ</a>
      `;
    }
  }
});

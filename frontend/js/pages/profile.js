/**
 * js/profile.js - Xử lý logic Trang hồ sơ sinh viên & lịch sử yêu cầu
 * Tuân thủ theo FRONTEND_GUIDE.md mục 1, 3, 4, 6, 9 và API.md mục 4.1, 4.4, 6.3
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Kiểm tra bắt buộc vai trò sinh viên
  const me = await requireLogin("student");
  if (!me) return;

  renderNavbar(me);
  renderFooter();

  const statusMessage = document.getElementById("status-message");
  const profileContainer = document.getElementById("profile-content");
  const pendingAlert = document.getElementById("pending-alert");
  const btnGoEdit = document.getElementById("btn-go-edit");
  const historyContainer = document.getElementById("requests-history-container");

  // 2. Tải thông tin hồ sơ và lịch sử yêu cầu song song
  statusMessage.style.display = "block";
  statusMessage.innerHTML = `
    <div class="spinner"></div>
    <h3>Đang tải hồ sơ của bạn...</h3>
    <p>Vui lòng chờ trong giây lát</p>
  `;
  profileContainer.style.display = "none";

  try {
    const [profile, requests] = await Promise.all([
      api("/api/me/profile"),
      api("/api/me/update-requests")
    ]);

    statusMessage.style.display = "none";
    profileContainer.style.display = "grid";

    // 3. Kiểm tra yêu cầu đang chờ duyệt (pending)
    const hasPending = Array.isArray(requests) && requests.some(r => r.status === "pending");
    if (hasPending) {
      pendingAlert.style.display = "flex";
      btnGoEdit.classList.add("btn-secondary");
      btnGoEdit.classList.remove("btn-primary");
      btnGoEdit.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        Đang có yêu cầu chờ duyệt
      `;
    }

    // 4. Render thông tin hồ sơ (Cột 1: Profile Card)
    const avatarImg = document.getElementById("my-avatar");
    avatarImg.src = profile.avatar_url || DEFAULT_AVATAR;
    setAvatarSrc(avatarImg, profile.avatar_url);
    avatarImg.alt = profile.full_name;

    const genderBadge = document.getElementById("my-gender-badge");
    genderBadge.textContent = profile.gender === "Nữ" ? "♀️" : "♂️";
    genderBadge.title = `Giới tính: ${profile.gender || "Chưa rõ"}`;

    document.getElementById("my-name").textContent = profile.full_name;
    document.getElementById("my-code").textContent = profile.student_code;
    document.getElementById("my-class").textContent = `Lớp: ${profile.class_code || "—"} (${profile.class_name || "—"})`;
    document.getElementById("my-major").textContent = `Ngành: ${profile.major_name || "Chưa cập nhật"}`;

    // Mạng xã hội
    const socialSection = document.getElementById("my-social-section");
    const socialContainer = document.getElementById("my-social-links");
    if (profile.social_links && profile.social_links.length > 0) {
      socialSection.style.display = "block";
      socialContainer.innerHTML = "";
      profile.social_links.forEach(item => {
        if (!item.url) return;
        const safeUrl = (item.url.startsWith("http://") || item.url.startsWith("https://")) ? item.url : `https://${item.url}`;
        const link = document.createElement("a");
        link.href = safeUrl;
        link.className = "social-btn";
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        let icon = "🔗";
        const lower = (item.platform || "").toLowerCase();
        if (lower.includes("facebook")) icon = "📘";
        else if (lower.includes("github")) icon = "🐙";
        else if (lower.includes("linkedin")) icon = "💼";

        link.innerHTML = `<span>${icon}</span> <span>${escapeHtml(item.platform || "Liên kết")}</span>`;
        socialContainer.appendChild(link);
      });
    } else {
      socialSection.style.display = "none";
    }

    // 5. Render Cột 2: Thông tin cá nhân
    document.getElementById("my-birth-date").textContent = formatDate(profile.birth_date);
    document.getElementById("my-gender").textContent = profile.gender || "—";
    document.getElementById("my-email").textContent = profile.email || "—";
    document.getElementById("my-phone").textContent = profile.phone || "—";
    document.getElementById("my-address").textContent = profile.address || "Chưa cập nhật";
    document.getElementById("my-created-at").textContent = formatDate(profile.created_at);
    document.getElementById("my-updated-at").textContent = profile.updated_at ? formatDateTime(profile.updated_at) : "Chưa từng chỉnh sửa";

    // Kỹ năng
    const skillsCard = document.getElementById("my-skills-card");
    const skillsList = document.getElementById("my-skills-list");
    if (profile.skills && profile.skills.length > 0) {
      skillsCard.style.display = "block";
      skillsList.innerHTML = "";
      profile.skills.forEach(skill => {
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

    // Sở thích
    const hobbiesCard = document.getElementById("my-hobbies-card");
    const hobbiesContent = document.getElementById("my-hobbies-content");
    if (profile.hobbies && profile.hobbies.trim() !== "") {
      hobbiesCard.style.display = "block";
      hobbiesContent.textContent = profile.hobbies;
    } else {
      hobbiesCard.style.display = "none";
    }

    // 6. Render Lịch sử yêu cầu cập nhật
    renderUpdateRequestsHistory(requests);

  } catch (err) {
    statusMessage.style.display = "block";
    statusMessage.innerHTML = `
      <div class="status-icon" style="color: var(--color-danger);">⚠️</div>
      <h3>Không thể tải thông tin hồ sơ</h3>
      <p>${escapeHtml(err.error || "Có lỗi xảy ra khi nạp dữ liệu từ máy chủ.")}</p>
    `;
  }

  /**
   * Render bảng lịch sử yêu cầu
   * @param {Array} requests
   */
  function renderUpdateRequestsHistory(requests) {
    if (!requests || requests.length === 0) {
      historyContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
          <div style="font-size: 2rem; margin-bottom: 8px;">📋</div>
          <p>Bạn chưa gửi yêu cầu cập nhật hồ sơ nào.</p>
        </div>
      `;
      return;
    }

    let html = `
      <table class="requests-table">
        <thead>
          <tr>
            <th style="width: 130px;">Thời gian gửi</th>
            <th>Nội dung đề nghị cập nhật</th>
            <th style="width: 120px;">Trạng thái</th>
            <th style="width: 150px;">Thời gian duyệt</th>
          </tr>
        </thead>
        <tbody>
    `;

    requests.forEach(req => {
      let badgeClass = "badge-pending";
      let statusText = "Chờ duyệt";
      if (req.status === "approved") {
        badgeClass = "badge-approved";
        statusText = "Đã duyệt";
      } else if (req.status === "rejected") {
        badgeClass = "badge-rejected";
        statusText = "Từ chối";
      }

      // Format dữ liệu new_data một cách thân thiện
      let detailsHtml = "";
      if (req.new_data) {
        const items = [];
        if (req.new_data.phone !== undefined) items.push(`<strong>Số ĐT:</strong> ${escapeHtml(req.new_data.phone)}`);
        if (req.new_data.address !== undefined) items.push(`<strong>Địa chỉ:</strong> ${escapeHtml(req.new_data.address || "<i>(Xóa)</i>")}`);
        if (req.new_data.hobbies !== undefined) items.push(`<strong>Sở thích:</strong> ${escapeHtml(req.new_data.hobbies || "<i>(Xóa)</i>")}`);
        if (req.new_data.skills !== undefined) {
          const skStr = req.new_data.skills.map(s => `${escapeHtml(s.name)} (mức ${s.level})`).join(", ");
          items.push(`<strong>Kỹ năng:</strong> ${skStr || "<i>(Xóa hết)</i>"}`);
        }
        if (req.new_data.social_links !== undefined) {
          const scStr = req.new_data.social_links.map(s => `${escapeHtml(s.platform)}`).join(", ");
          items.push(`<strong>Mạng xã hội:</strong> ${scStr || "<i>(Xóa hết)</i>"}`);
        }
        detailsHtml = items.join("<br>");
      }

      // Nếu bị từ chối kèm lý do
      let rejectReasonHtml = "";
      if (req.status === "rejected" && req.reject_reason) {
        rejectReasonHtml = `
          <div style="margin-top: 6px; padding: 6px 10px; background: #ffebee; border-radius: 4px; color: #c62828; font-size: 0.82rem;">
            <strong>Lý do từ chối:</strong> ${escapeHtml(req.reject_reason)}
          </div>
        `;
      }

      html += `
        <tr>
          <td><small>${formatDateTime(req.created_at)}</small></td>
          <td>
            <div>${detailsHtml}</div>
            ${rejectReasonHtml}
          </td>
          <td><span class="badge ${badgeClass}">${statusText}</span></td>
          <td><small>${formatDateTime(req.reviewed_at)}</small></td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    historyContainer.innerHTML = html;
  }
});

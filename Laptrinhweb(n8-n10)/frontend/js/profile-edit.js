/**
 * js/profile-edit.js - Xử lý logic Sinh viên gửi yêu cầu cập nhật hồ sơ
 * Tuân thủ theo FRONTEND_GUIDE.md mục 1, 3, 5.1, 6, 7 và API.md mục 5.1, 5.2, 6.3
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Kiểm tra bắt buộc đăng nhập vai trò sinh viên
  const me = await requireLogin("student");
  if (!me) return;

  renderNavbar(me);
  renderFooter();

  const statusMessage = document.getElementById("status-message");
  const editLayout = document.getElementById("edit-layout");
  const form = document.getElementById("request-form");
  const submitBtn = document.getElementById("btn-submit");
  const pendingAlert = document.getElementById("pending-alert");

  const skillsContainer = document.getElementById("skills-container");
  const btnAddSkill = document.getElementById("btn-add-skill");
  const socialContainer = document.getElementById("social-container");
  const btnAddSocial = document.getElementById("btn-add-social");
  const skillsDatalist = document.getElementById("skills-datalist");

  let initialProfile = null;
  let hasPending = false;

  // 2. Nạp dữ liệu hồ sơ hiện tại và danh mục kỹ năng
  statusMessage.style.display = "block";
  statusMessage.innerHTML = `
    <div class="spinner"></div>
    <h3>Đang tải dữ liệu hồ sơ...</h3>
    <p>Vui lòng chờ trong giây lát</p>
  `;

  try {
    const [profile, requests, skillsList] = await Promise.all([
      api("/api/me/profile"),
      api("/api/me/update-requests"),
      api("/api/skills?q=").catch(() => [])
    ]);

    initialProfile = profile;
    statusMessage.style.display = "none";
    editLayout.style.display = "grid";

    // Nạp gợi ý datalist kỹ năng
    if (Array.isArray(skillsList)) {
      skillsDatalist.innerHTML = "";
      skillsList.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.name;
        skillsDatalist.appendChild(opt);
      });
    }

    // Kiểm tra nếu đang có yêu cầu chờ duyệt
    hasPending = Array.isArray(requests) && requests.some(r => r.status === "pending");
    if (hasPending) {
      pendingAlert.style.display = "flex";
      submitBtn.disabled = true;
      submitBtn.title = "Bạn đang có yêu cầu chờ duyệt, không thể gửi yêu cầu mới.";
    }

    // 3. Đổ dữ liệu chỉ đọc vào Cột 1 (Admin quản lý)
    const roAvatar = document.getElementById("ro-avatar");
    roAvatar.src = profile.avatar_url || DEFAULT_AVATAR;
    roAvatar.alt = profile.full_name;

    document.getElementById("ro-name").textContent = profile.full_name;
    document.getElementById("ro-code").textContent = profile.student_code;
    document.getElementById("ro-class").textContent = `${profile.class_code} - ${profile.class_name}`;
    document.getElementById("ro-major").textContent = profile.major_name || "—";
    document.getElementById("ro-email").textContent = profile.email || "—";
    document.getElementById("ro-birth-date").textContent = formatDate(profile.birth_date);
    document.getElementById("ro-gender").textContent = profile.gender || "—";

    // 4. Đổ dữ liệu có thể sửa vào Form Cột 2
    document.getElementById("phone").value = profile.phone || "";
    document.getElementById("address").value = profile.address || "";
    document.getElementById("hobbies").value = profile.hobbies || "";

    // Đổ danh sách kỹ năng ban đầu
    skillsContainer.innerHTML = "";
    if (profile.skills && profile.skills.length > 0) {
      profile.skills.forEach(skill => addSkillRow(skill.name, skill.level));
    }

    // Đổ danh sách mạng xã hội ban đầu
    socialContainer.innerHTML = "";
    if (profile.social_links && profile.social_links.length > 0) {
      profile.social_links.forEach(link => addSocialRow(link.platform, link.url));
    }

  } catch (err) {
    statusMessage.style.display = "block";
    statusMessage.innerHTML = `
      <div class="status-icon" style="color: var(--color-danger);">⚠️</div>
      <h3>Không thể tải thông tin hồ sơ</h3>
      <p>${escapeHtml(err.error || "Có lỗi xảy ra khi nạp dữ liệu từ máy chủ.")}</p>
    `;
    return;
  }

  // 5. Quản lý hàng kỹ năng động
  function addSkillRow(name = "", level = 3) {
    const row = document.createElement("div");
    row.className = "dynamic-row skill-input-row";
    row.innerHTML = `
      <div style="flex: 2; position: relative;">
        <input 
          type="text" 
          class="form-control skill-name-input" 
          placeholder="Tên kỹ năng (VD: Python, SQL...)" 
          value="${escapeHtml(name)}" 
          list="skills-datalist" 
          maxlength="50"
        >
        <span class="field-error row-error"></span>
      </div>
      <div style="flex: 1.5;">
        <select class="form-select skill-level-select">
          <option value="1" ${level == 1 ? "selected" : ""}>1 - Cơ bản</option>
          <option value="2" ${level == 2 ? "selected" : ""}>2 - Sơ cấp</option>
          <option value="3" ${level == 3 ? "selected" : ""}>3 - Trung bình</option>
          <option value="4" ${level == 4 ? "selected" : ""}>4 - Khá</option>
          <option value="5" ${level == 5 ? "selected" : ""}>5 - Thành thạo</option>
        </select>
      </div>
      <button type="button" class="btn-remove-row" title="Xóa kỹ năng này">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    row.querySelector(".btn-remove-row").onclick = () => row.remove();
    skillsContainer.appendChild(row);
  }

  btnAddSkill.addEventListener("click", () => addSkillRow("", 3));

  // 6. Quản lý hàng mạng xã hội động
  function addSocialRow(platform = "Facebook", url = "") {
    const row = document.createElement("div");
    row.className = "dynamic-row social-input-row";

    const standardPlatforms = ["Facebook", "GitHub", "LinkedIn", "Twitter/X", "Instagram"];
    const isCustom = !standardPlatforms.includes(platform) && platform !== "";

    row.innerHTML = `
      <div style="flex: 1.2;">
        <select class="form-select social-platform-select">
          <option value="Facebook" ${platform === "Facebook" ? "selected" : ""}>Facebook</option>
          <option value="GitHub" ${platform === "GitHub" ? "selected" : ""}>GitHub</option>
          <option value="LinkedIn" ${platform === "LinkedIn" ? "selected" : ""}>LinkedIn</option>
          <option value="Twitter/X" ${platform === "Twitter/X" ? "selected" : ""}>Twitter/X</option>
          <option value="Instagram" ${platform === "Instagram" ? "selected" : ""}>Instagram</option>
          <option value="Khác" ${isCustom ? "selected" : ""}>Khác</option>
        </select>
        <input 
          type="text" 
          class="form-control social-custom-platform" 
          placeholder="Nhập tên nền tảng..." 
          value="${isCustom ? escapeHtml(platform) : ""}" 
          style="margin-top: 6px; display: ${isCustom ? "block" : "none"};"
          maxlength="30"
        >
      </div>
      <div style="flex: 2; position: relative;">
        <input 
          type="url" 
          class="form-control social-url-input" 
          placeholder="https://..." 
          value="${escapeHtml(url)}" 
          maxlength="255"
        >
        <span class="field-error row-error"></span>
      </div>
      <button type="button" class="btn-remove-row" title="Xóa liên kết này">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    const select = row.querySelector(".social-platform-select");
    const customInput = row.querySelector(".social-custom-platform");
    select.addEventListener("change", () => {
      customInput.style.display = select.value === "Khác" ? "block" : "none";
      if (select.value !== "Khác") customInput.value = "";
    });

    row.querySelector(".btn-remove-row").onclick = () => row.remove();
    socialContainer.appendChild(row);
  }

  btnAddSocial.addEventListener("click", () => addSocialRow("Facebook", ""));

  // Đọc mảng kỹ năng từ các hàng (loại bỏ hàng rỗng)
  function readSkillsFromForm() {
    const rows = skillsContainer.querySelectorAll(".skill-input-row");
    const list = [];
    const seenNames = new Set();

    rows.forEach(row => {
      const name = row.querySelector(".skill-name-input").value.trim();
      const level = parseInt(row.querySelector(".skill-level-select").value, 10) || 3;
      if (name) {
        // Tránh trùng tên
        const lowerName = name.toLowerCase();
        if (!seenNames.has(lowerName)) {
          seenNames.add(lowerName);
          list.push({ name, level });
        }
      }
    });
    return list;
  }

  // Đọc mảng mạng xã hội từ các hàng
  function readSocialsFromForm() {
    const rows = socialContainer.querySelectorAll(".social-input-row");
    const list = [];
    const seenPlatforms = new Set();

    rows.forEach(row => {
      const select = row.querySelector(".social-platform-select");
      const customInput = row.querySelector(".social-custom-platform");
      let platform = select.value === "Khác" ? customInput.value.trim() : select.value;
      const url = row.querySelector(".social-url-input").value.trim();

      if (platform && url) {
        const lowerPlat = platform.toLowerCase();
        if (!seenPlatforms.has(lowerPlat)) {
          seenPlatforms.add(lowerPlat);
          list.push({ platform, url });
        }
      }
    });
    return list;
  }

  // 7. Bắt sự kiện gửi form đề nghị cập nhật
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);

    // Xóa lỗi các hàng con
    document.querySelectorAll(".row-error").forEach(span => span.textContent = "");

    if (hasPending) {
      showFormError("Bạn đang có yêu cầu chờ duyệt, vui lòng đợi Admin xử lý trước.");
      return;
    }

    const currentPhone = document.getElementById("phone").value.trim();
    const currentAddress = document.getElementById("address").value.trim();
    const currentHobbies = document.getElementById("hobbies").value.trim();
    const currentSkills = readSkillsFromForm();
    const currentSocials = readSocialsFromForm();

    // Validate client-side
    let hasLocalError = false;

    // Validate SĐT: bắt buộc, 10 số bắt đầu bằng 0
    if (!currentPhone) {
      showErrors({ field: "phone", error: "Số điện thoại không được để trống" }, form);
      hasLocalError = true;
    } else if (!/^0\d{9}$/.test(currentPhone)) {
      showErrors({ field: "phone", error: "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0" }, form);
      hasLocalError = true;
    }

    // Validate URLs mạng xã hội
    const socialRows = socialContainer.querySelectorAll(".social-input-row");
    socialRows.forEach(row => {
      const url = row.querySelector(".social-url-input").value.trim();
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        const errSpan = row.querySelector(".row-error");
        if (errSpan) errSpan.textContent = "URL phải bắt đầu bằng http:// hoặc https://";
        row.querySelector(".social-url-input").classList.add("input-invalid");
        hasLocalError = true;
      }
    });

    if (hasLocalError) return;

    // So sánh dữ liệu thay đổi theo FRONTEND_GUIDE mục 6
    const payload = {};

    if (currentPhone !== (initialProfile.phone || "")) {
      payload.phone = currentPhone;
    }

    if (currentAddress !== (initialProfile.address || "")) {
      payload.address = currentAddress; // "" nghĩa là xóa giá trị
    }

    if (currentHobbies !== (initialProfile.hobbies || "")) {
      payload.hobbies = currentHobbies; // "" nghĩa là xóa giá trị
    }

    // So sánh kỹ năng
    const initSkills = (initialProfile.skills || []).map(s => ({ name: s.name, level: s.level }));
    const isSkillsChanged = JSON.stringify(currentSkills) !== JSON.stringify(initSkills);
    if (isSkillsChanged) {
      payload.skills = currentSkills; // Gửi cả mảng mới
    }

    // So sánh mạng xã hội
    const initSocials = (initialProfile.social_links || []).map(s => ({ platform: s.platform, url: s.url }));
    const isSocialsChanged = JSON.stringify(currentSocials) !== JSON.stringify(initSocials);
    if (isSocialsChanged) {
      payload.social_links = currentSocials; // Gửi cả mảng mới
    }

    // Kiểm tra nếu không có gì thay đổi
    if (Object.keys(payload).length === 0) {
      showToast("Bạn chưa thay đổi thông tin nào so với hồ sơ hiện tại.", "warning");
      showFormError("Bạn chưa thay đổi thông tin nào.");
      return;
    }

    // Vô hiệu hóa nút trong khi gửi
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <div class="spinner" style="width: 16px; height: 16px; border-width: 2px; margin: 0; vertical-align: middle;"></div>
      Đang gửi yêu cầu...
    `;

    try {
      await api("/api/me/update-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      showToast("Đã gửi yêu cầu cập nhật hồ sơ thành công!", "success");

      setTimeout(() => {
        location.href = "profile.html";
      }, 1000);

    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      // Xử lý lỗi trường lồng nhau: skills[1].level hoặc social_links[0].url
      if (err.field && err.field.startsWith("skills[")) {
        const match = err.field.match(/skills\[(\d+)\]\.(\w+)/);
        if (match) {
          const index = parseInt(match[1], 10);
          const prop = match[2];
          const rows = skillsContainer.querySelectorAll(".skill-input-row");
          if (rows[index]) {
            const errSpan = rows[index].querySelector(".row-error");
            if (errSpan) errSpan.textContent = err.error;
            const input = prop === "level" ? rows[index].querySelector(".skill-level-select") : rows[index].querySelector(".skill-name-input");
            if (input) input.classList.add("input-invalid");
            return;
          }
        }
      }

      if (err.field && err.field.startsWith("social_links[")) {
        const match = err.field.match(/social_links\[(\d+)\]\.(\w+)/);
        if (match) {
          const index = parseInt(match[1], 10);
          const rows = socialContainer.querySelectorAll(".social-input-row");
          if (rows[index]) {
            const errSpan = rows[index].querySelector(".row-error");
            if (errSpan) errSpan.textContent = err.error;
            const input = rows[index].querySelector(".social-url-input");
            if (input) input.classList.add("input-invalid");
            return;
          }
        }
      }

      showErrors(err, form);
    }
  });
});

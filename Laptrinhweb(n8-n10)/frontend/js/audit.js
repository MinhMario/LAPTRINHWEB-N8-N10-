// audit.js - nhật ký thao tác (mới nhất trước). old_data / new_data là JSON tự do -> hiển thị dạng "trường: giá trị"
const PAGE_SIZE = 20;
let currentPage = 1;

const actionFilter = document.getElementById("action-filter");
const targetTypeFilter = document.getElementById("target-type-filter");
const targetIdFilter = document.getElementById("target-id-filter");
const tableBody = document.getElementById("audit-table-body");
const pagination = document.getElementById("pagination");

const ACTION_LABELS = { create: "Thêm", update: "Sửa", delete: "Xóa", approve: "Duyệt", reject: "Từ chối" };
const TARGET_LABELS = { student: "Sinh viên", class: "Lớp", major: "Ngành" };
const KEY_LABELS = {
  student_code: "Mã SV", full_name: "Họ tên", gender: "Giới tính", birth_date: "Ngày sinh", email: "Email",
  phone: "Số điện thoại", address: "Địa chỉ", hobbies: "Sở thích", class: "Lớp", class_id: "Lớp (id)",
  skills: "Kỹ năng", social_links: "Mạng xã hội", reject_reason: "Lý do từ chối", code: "Mã", name: "Tên",
  major_id: "Ngành (id)",
};

// Dựng DOM từ giá trị JSON bất kỳ (chỉ dùng textContent, không dùng innerHTML)
function renderValue(value) {
  if (value === null || value === undefined || value === "") return document.createTextNode("---");
  if (Array.isArray(value)) {
    if (!value.length) return document.createTextNode("(trống)");
    const ul = document.createElement("ul");
    ul.className = "json-list";
    value.forEach((item) => {
      const li = document.createElement("li");
      if (item && typeof item === "object") {
        // gọn cho kỹ năng / mạng xã hội, còn lại hiện đủ cặp khóa: giá trị
        if ("name" in item && "level" in item) li.textContent = `${item.name} (${item.level}/5)`;
        else if ("platform" in item && "url" in item) li.textContent = `${item.platform}: ${item.url}`;
        else li.appendChild(renderValue(item));
      } else li.textContent = String(item);
      ul.appendChild(li);
    });
    return ul;
  }
  if (typeof value === "object") {
    const ul = document.createElement("ul");
    ul.className = "json-list";
    Object.keys(value).forEach((key) => {
      const li = document.createElement("li");
      const k = document.createElement("span");
      k.className = "json-key";
      k.textContent = `${KEY_LABELS[key] || key}: `;
      li.append(k, renderValue(value[key]));
      ul.appendChild(li);
    });
    return ul;
  }
  if (typeof value === "boolean") return document.createTextNode(value ? "Có" : "Không");
  return document.createTextNode(String(value));
}

function detailBlock(title, data) {
  const div = document.createElement("div");
  const h = document.createElement("h4");
  h.textContent = title;
  div.append(h, renderValue(data));
  return div;
}

function buildRows(log) {
  const tr = document.createElement("tr");
  const add = (text) => { const td = document.createElement("td"); td.textContent = text; tr.appendChild(td); return td; };
  add(formatDateTime(log.created_at));
  add(log.username);
  const tdAction = document.createElement("td");
  const tag = document.createElement("span");
  tag.className = `action-tag action-${log.action}`;
  tag.textContent = ACTION_LABELS[log.action] || log.action;
  tdAction.appendChild(tag);
  tr.appendChild(tdAction);
  add(TARGET_LABELS[log.target_type] || log.target_type);
  add(log.target_id);

  const detailTr = document.createElement("tr");
  detailTr.hidden = true;
  const detailTd = document.createElement("td");
  detailTd.colSpan = 6;
  detailTd.className = "audit-detail";
  if (log.old_data === null && log.new_data === null) detailTd.textContent = "Không có dữ liệu chi tiết";
  else {
    if (log.old_data !== null) detailTd.appendChild(detailBlock("Dữ liệu cũ", log.old_data));
    if (log.new_data !== null) detailTd.appendChild(detailBlock("Dữ liệu mới", log.new_data));
  }
  detailTr.appendChild(detailTd);

  const tdBtn = document.createElement("td");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-outline btn-sm";
  btn.textContent = "Chi tiết";
  btn.setAttribute("aria-expanded", "false");
  btn.addEventListener("click", () => {
    detailTr.hidden = !detailTr.hidden;
    btn.textContent = detailTr.hidden ? "Chi tiết" : "Thu gọn";
    btn.setAttribute("aria-expanded", String(!detailTr.hidden));
  });
  tdBtn.appendChild(btn);
  tr.appendChild(tdBtn);
  return [tr, detailTr];
}

async function loadLogs() {
  showStatus("Đang tải...", "info");
  tableBody.textContent = "";
  const params = new URLSearchParams({ page: currentPage, page_size: PAGE_SIZE });
  if (actionFilter.value) params.set("action", actionFilter.value);
  if (targetTypeFilter.value) params.set("target_type", targetTypeFilter.value);
  const targetId = targetIdFilter.value.trim();
  // target_id dùng cùng target_type theo API.md
  if (targetId) params.set("target_id", targetId);

  try {
    const data = await api(`/api/audit-logs?${params}`);
    if (data.items.length === 0) {
      showStatus("Không có kết quả", "empty");
      pagination.textContent = "";
      return;
    }
    hideStatus();
    data.items.forEach((log) => buildRows(log).forEach((row) => tableBody.appendChild(row)));
    renderPagination(pagination, data.page, data.total_pages, (p) => { currentPage = p; loadLogs(); });
  } catch (err) {
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
    pagination.textContent = "";
  }
}

function resetToFirstPage() { currentPage = 1; loadLogs(); }

actionFilter.addEventListener("change", resetToFirstPage);
targetTypeFilter.addEventListener("change", resetToFirstPage);
targetIdFilter.addEventListener("input", debounce(resetToFirstPage, 300));
document.getElementById("reset-filter-btn").addEventListener("click", () => {
  actionFilter.value = "";
  targetTypeFilter.value = "";
  targetIdFilter.value = "";
  resetToFirstPage();
});

(async function init() {
  const me = await requireLogin("admin");
  if (!me) return;
  initAdminNav(me);
  loadLogs();
})();

/**
 * js/pages/admin-requests.js - Admin xem, so sánh và duyệt/từ chối yêu cầu cập nhật hồ sơ
 */

const PAGE_SIZE = 10;

const FIELD_LABELS = {
  phone: "Số điện thoại",
  address: "Địa chỉ",
  hobbies: "Sở thích",
  skills: "Kỹ năng",
  social_links: "Mạng xã hội",
};

const STATUS_LABELS = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

let currentPage = 1;
let currentRequestId = null;

const statusFilter = document.getElementById("status-filter");
const tableBody = document.getElementById("request-table-body");
const pagination = document.getElementById("pagination");
const modal = document.getElementById("request-modal");
const requestForm = document.getElementById("request-form");
const rejectBox = document.getElementById("reject-box");
const rejectBtn = document.getElementById("reject-btn");
const confirmRejectBtn = document.getElementById("confirm-reject-btn");
const approveBtn = document.getElementById("approve-btn");

// ── HIỂN THỊ DANH SÁCH YÊU CẦU ───────────────────────────────────────────────

function createStatusBadge(status) {
  const span = document.createElement("span");
  span.className = `badge badge-${status}`;
  span.textContent = STATUS_LABELS[status] || status;
  return span;
}

function appendCell(tr, text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  tr.appendChild(td);
  return td;
}

function buildRow(req) {
  const tr = document.createElement("tr");

  appendCell(tr, req.student_code);
  appendCell(tr, req.full_name, "cell-name");
  appendCell(tr, formatDateTime(req.created_at));

  const tdStatus = document.createElement("td");
  tdStatus.appendChild(createStatusBadge(req.status));
  tr.appendChild(tdStatus);

  appendCell(tr, formatDateTime(req.reviewed_at));

  const tdAction = document.createElement("td");
  const viewBtn = document.createElement("button");
  viewBtn.type = "button";
  viewBtn.className = "btn btn-primary btn-sm";
  viewBtn.textContent = req.status === "pending" ? "Xem & duyệt" : "Xem";
  viewBtn.addEventListener("click", () => openRequest(req.id));
  tdAction.appendChild(viewBtn);
  tr.appendChild(tdAction);

  return tr;
}

async function loadRequests() {
  showStatus("Đang tải...", "info");
  tableBody.textContent = "";

  const params = new URLSearchParams({
    status: statusFilter.value,
    page: currentPage,
    page_size: PAGE_SIZE,
  });

  try {
    const data = await api(`/api/update-requests?${params}`);

    if (data.items.length === 0 && currentPage > 1 && data.total_pages > 0) {
      currentPage = data.total_pages;
      return loadRequests();
    }

    if (data.items.length === 0) {
      showStatus("Không có kết quả", "empty");
      pagination.textContent = "";
      return;
    }

    hideStatus();
    data.items.forEach((req) => tableBody.appendChild(buildRow(req)));
    renderPagination(pagination, data.page, data.total_pages, (page) => {
      currentPage = page;
      loadRequests();
    });
  } catch (err) {
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
    pagination.textContent = "";
  }
}

// ── BẢNG SO SÁNH "HIỆN TẠI -> ĐỀ NGHỊ" ───────────────────────────────────────

function createValueNode(key, value) {
  const wrap = document.createElement("div");

  if (value === undefined || value === null || value === "") {
    wrap.textContent = "---";
    return wrap;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      wrap.textContent = "(trống)";
      return wrap;
    }

    const ul = document.createElement("ul");
    value.forEach((item) => {
      const li = document.createElement("li");
      if (key === "skills") {
        li.textContent = `${item.name} (${item.level}/5)`;
      } else if (key === "social_links") {
        li.textContent = `${item.platform}: ${item.url}`;
      } else {
        li.textContent = typeof item === "object" ? JSON.stringify(item) : String(item);
      }
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  wrap.textContent = String(value);
  return wrap;
}

function renderCompare(detail) {
  const compareBody = document.getElementById("compare-body");
  compareBody.textContent = "";

  const currentData = detail.current || {};
  const proposedData = detail.new_data || {};

  Object.keys(proposedData).forEach((key) => {
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.className = "cell-label";
    tdLabel.textContent = FIELD_LABELS[key] || key;

    const tdOld = document.createElement("td");
    tdOld.appendChild(createValueNode(key, currentData[key]));

    const tdNew = document.createElement("td");
    tdNew.appendChild(createValueNode(key, proposedData[key]));

    tr.append(tdLabel, tdOld, tdNew);
    compareBody.appendChild(tr);
  });
}

// ── MODAL CHI TIẾT & XỬ LÝ DUYỆT / TỪ CHỐI ──────────────────────────────────

async function openRequest(id) {
  adminClearErrors(requestForm);
  adminClearErrors(modal);
  currentRequestId = id;

  rejectBox.hidden = true;
  confirmRejectBtn.hidden = true;
  requestForm.reset();

  try {
    const detail = await api(`/api/update-requests/${encodeURIComponent(id)}`);

    const avatar = document.getElementById("req-avatar");
    setAvatarSrc(avatar, detail.student.avatar_url);

    setText("req-student-name", detail.student.full_name);
    setText("req-student-code", detail.student.student_code);
    setText("req-created", formatDateTime(detail.created_at));

    const statusEl = document.getElementById("req-status");
    statusEl.textContent = "";
    statusEl.appendChild(createStatusBadge(detail.status));

    renderCompare(detail);

    const reasonEl = document.getElementById("req-reject-reason");
    const hasRejectReason = detail.status === "rejected" && detail.reject_reason;
    reasonEl.hidden = !hasRejectReason;
    reasonEl.textContent = hasRejectReason ? `Lý do từ chối: ${detail.reject_reason}` : "";

    // Chỉ yêu cầu đang chờ duyệt mới hiện nút Duyệt / Từ chối
    const isPending = detail.status === "pending";
    approveBtn.hidden = !isPending;
    rejectBtn.hidden = !isPending;
    approveBtn.disabled = false;

    modal.hidden = false;
  } catch (err) {
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
  }
}

function closeModal() {
  modal.hidden = true;
  currentRequestId = null;
}

async function afterProcessed(message) {
  closeModal();
  await loadRequests();
  showStatus(message, "success");
  refreshPendingBadge();
}

approveBtn.addEventListener("click", async () => {
  adminClearErrors(modal);
  approveBtn.disabled = true;

  try {
    await api(`/api/update-requests/${currentRequestId}/approve`, { method: "POST" });
    await afterProcessed("Đã duyệt yêu cầu, hồ sơ sinh viên đã được cập nhật");
  } catch (err) {
    adminShowError(err, modal);
    approveBtn.disabled = false;
  }
});

// Bấm "Từ chối" lần 1 để hiện ô nhập lý do; bấm "Xác nhận từ chối" để gửi
rejectBtn.addEventListener("click", () => {
  rejectBox.hidden = false;
  rejectBtn.hidden = true;
  approveBtn.hidden = true;
  confirmRejectBtn.hidden = false;
  document.getElementById("reject_reason").focus();
});

requestForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminClearErrors(modal);

  const reason = requestForm.elements.reject_reason.value.trim();
  if (!reason) {
    adminShowError({ error: "Vui lòng nhập lý do từ chối", field: "reject_reason" }, modal);
    return;
  }

  confirmRejectBtn.disabled = true;
  try {
    await api(`/api/update-requests/${currentRequestId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reject_reason: reason }),
    });
    await afterProcessed("Đã từ chối yêu cầu");
  } catch (err) {
    adminShowError(err, modal);
  } finally {
    confirmRejectBtn.disabled = false;
  }
});

// ── SỰ KIỆN & KHỞI TẠO ───────────────────────────────────────────────────────

document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-close-x").addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

statusFilter.addEventListener("change", () => {
  currentPage = 1;
  loadRequests();
});

(async function init() {
  const me = await requireLogin("admin");
  if (!me) return;

  initAdminNav(me);
  loadRequests();
})();
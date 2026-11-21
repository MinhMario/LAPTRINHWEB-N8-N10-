// dashboard.js - thẻ số liệu, biểu đồ theo lớp, 5 hồ sơ mới nhất (GET /api/stats)
let classChart = null;

function renderStats(stats) {
  setText("total-students", stats.total_students);
  setText("total-classes", stats.total_classes);
  setText("total-majors", stats.total_majors);
  setText("pending-requests", stats.pending_requests);
}

function renderChart(byClass) {
  const canvas = document.getElementById("class-chart");
  if (typeof Chart === "undefined") {
    // CDN không tải được (mất mạng): hiện danh sách số liệu thay thế
    canvas.replaceWith(document.createTextNode(
      byClass.map((c) => `${c.class_code}: ${c.count}`).join(" | ") || "Không có kết quả"
    ));
    return;
  }
  if (classChart) classChart.destroy();
  classChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: byClass.map((c) => c.class_code),
      datasets: [{
        label: "Số sinh viên",
        data: byClass.map((c) => c.count),
        backgroundColor: "#1a73e8",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: (items) => byClass[items[0].dataIndex].class_name } },
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

function renderRecent(recent) {
  const list = document.getElementById("recent-list");
  list.textContent = "";
  if (!recent.length) {
    const li = document.createElement("li");
    li.textContent = "Không có kết quả";
    list.appendChild(li);
    return;
  }
  recent.forEach((s) => {
    const li = document.createElement("li");
    const img = document.createElement("img");
    img.className = "avatar-sm";
    img.alt = "";
    img.src = s.avatar_url;
    bindAvatarFallback(img);

    const a = document.createElement("a");
    a.href = `/pages/detail.html?id=${encodeURIComponent(s.id)}`;
    a.textContent = `${s.full_name} (${s.student_code})`;
    li.append(img, a);
    list.appendChild(li);
  });
}

async function loadDashboard() {
  showStatus("Đang tải...", "info");
  try {
    const stats = await api("/api/stats");
    hideStatus();
    renderStats(stats);
    renderChart(stats.by_class || []);
    renderRecent(stats.recent || []);
  } catch (err) {
    showStatus((err && err.error) || "Không thể kết nối máy chủ, vui lòng thử lại", "error");
  }
}

(async function init() {
  const me = await requireLogin("admin");
  if (!me) return;
  initAdminNav(me);
  loadDashboard();
})();

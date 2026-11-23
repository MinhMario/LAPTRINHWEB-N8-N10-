/**
 * js/pages/admin-dashboard.js - Trang Dashboard thống kê (GET /api/stats)
 */

let classChart = null;

// ── HIỂN THỊ DỮ LIỆU ─────────────────────────────────────────────────────────

function renderStats(stats) {
  setText("total-students", stats.total_students);
  setText("total-classes", stats.total_classes);
  setText("total-majors", stats.total_majors);
  setText("pending-requests", stats.pending_requests);
}

function renderChart(byClass) {
  const canvas = document.getElementById("class-chart");

  // Dự phòng khi mất mạng không tải được Chart.js từ CDN
  if (typeof Chart === "undefined") {
    const summary = byClass.map((c) => `${c.class_code}: ${c.count}`).join(" | ");
    canvas.replaceWith(document.createTextNode(summary || "Không có kết quả"));
    return;
  }

  if (classChart) {
    classChart.destroy();
  }

  classChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: byClass.map((c) => c.class_code),
      datasets: [
        {
          label: "Số sinh viên",
          data: byClass.map((c) => c.count),
          backgroundColor: "#1a73e8",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => byClass[items[0].dataIndex].class_name,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

function renderRecent(recent) {
  const list = document.getElementById("recent-list");
  list.textContent = "";

  if (!recent.length) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Không có kết quả";
    list.appendChild(emptyItem);
    return;
  }

  recent.forEach((student) => {
    const li = document.createElement("li");

    const img = document.createElement("img");
    img.className = "avatar-sm";
    img.alt = "";
    setAvatarSrc(img, student.avatar_url);

    const link = document.createElement("a");
    link.href = `/pages/detail.html?id=${encodeURIComponent(student.id)}`;
    link.textContent = `${student.full_name} (${student.student_code})`;

    li.append(img, link);
    list.appendChild(li);
  });
}

// ── TẢI DỮ LIỆU & KHỞI TẠO ───────────────────────────────────────────────────

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
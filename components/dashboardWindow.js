// ===== Dashboard Panel =====
window.createDashboard = function () {
  const panel = document.createElement("div");

  // Modern Glassmorphic Styles
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "340px",
    minHeight: "260px",
    background: "linear-gradient(135deg, rgba(45, 27, 105, 0.9) 0%, rgba(106, 13, 173, 0.8) 100%)",
    backdropFilter: "blur(15px)",
    WebkitBackdropFilter: "blur(15px)",
    color: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    zIndex: "10000",
    display: "none",
    padding: "20px",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    transition: "all 0.3s ease-in-out",
    overflow: "hidden"
  });

  // Inject Styles for components
  const style = document.createElement("style");
  style.textContent = `
    .db-header { font-size: 20px; font-weight: 700; margin-bottom: 15px; background: linear-gradient(to right, #fff, #d1d1d1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .db-quote { font-style: italic; color: #e0e0e0; margin-bottom: 15px; padding-left: 10px; border-left: 3px solid #E100FF; line-height: 1.4; font-size: 13px; }
    .db-stats { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
    .db-stat-item { background: rgba(255,255,255,0.1); padding: 8px 12px; borderRadius: 8px; flex: 1; min-width: 120px; border: 1px solid rgba(255,255,255,0.05); }
    .db-stat-label { font-size: 10px; text-transform: uppercase; color: #bbb; display: block; margin-bottom: 2px; }
    .db-stat-value { font-size: 14px; font-weight: 600; color: #fff; }
    .db-list { list-style: none; padding: 0; margin: 0 0 20px 0; max-height: 150px; overflow-y: auto; }
    .db-list::-webkit-scrollbar { width: 4px; }
    .db-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
    .db-list-item { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; display: flex; justify-content: space-between; }
    .db-list-item:last-child { border-bottom: none; }
    .db-severity { color: #ff4757; font-weight: 700; font-size: 11px; }
    .db-footer { display: flex; gap: 10px; margin-top: auto; }
    .db-btn { cursor: pointer; border: none; border-radius: 8px; padding: 10px 15px; font-weight: 600; font-size: 13px; transition: all 0.2s ease; flex: 1; }
    .db-btn-primary { background: linear-gradient(135deg, #E100FF 0%, #7F00FF 100%); color: white; box-shadow: 0 4px 15px rgba(127, 0, 255, 0.3); }
    .db-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(127, 0, 255, 0.4); }
    .db-btn-secondary { background: rgba(255,255,255,0.1); color: white; }
    .db-btn-secondary:hover { background: rgba(255,255,255,0.2); }
  `;
  document.head.appendChild(style);

  // Default skeleton
  panel.innerHTML = `
    <div class="db-header">Dashboard</div>
    <p style="opacity: 0.7; font-size: 14px;">Syncing your progress...</p>
    <div class="db-footer" style="margin-top: 20px;">
      <button id="close1" class="db-btn db-btn-secondary">Close</button>
    </div>
  `;

  document.body.appendChild(panel);

  // ===== Render Function =====
  panel.renderData = function (data) {
    const revisitList = data.revisit
      .map(p => `
        <li class="db-list-item">
          <span>${p.title}</span>
          <span class="db-severity">${p.struggle}</span>
        </li>`)
      .join("");

    panel.innerHTML = `
      <div class="db-header">LeetCode Progress</div>

      <div class="db-quote">"${data.quote}"</div>

      <div class="db-stats">
        <div class="db-stat-item">
          <span class="db-stat-label">Weak Topic</span>
          <span class="db-stat-value">${data.weakTopic}</span>
        </div>
        <div class="db-stat-item">
          <span class="db-stat-label">Avg Time</span>
          <span class="db-stat-value">${data.avgTime}s</span>
        </div>
      </div>

      <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; opacity: 0.8; text-transform: uppercase;">Needs Revisit</div>
      <ul class="db-list">${revisitList || "<li class='db-list-item'>All caught up! 🎉</li>"}</ul>

      <div class="db-footer">
        <button id="goNext" class="db-btn db-btn-primary">Go to Next</button>
        <button id="close1" class="db-btn db-btn-secondary">Close</button>
      </div>
    `;
  };

  return panel;
};
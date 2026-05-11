// ===== Dashboard Panel =====
window.createDashboard = function () {
  const panel = document.createElement("div");

  // Modern Glassmorphic Styles
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "380px",
    maxHeight: "85vh",
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
    overflow: "auto"
  });

  // Inject Styles for components
  const style = document.createElement("style");
  style.textContent = `
    .db-header { font-size: 20px; font-weight: 700; margin-bottom: 15px; background: linear-gradient(to right, #fff, #d1d1d1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .db-quote { font-style: italic; color: #e0e0e0; margin-bottom: 15px; padding-left: 10px; border-left: 3px solid #E100FF; line-height: 1.4; font-size: 13px; }
    .db-footer { display: flex; gap: 10px; margin-top: auto; }
    .db-btn { cursor: pointer; border: none; border-radius: 8px; padding: 10px 15px; font-weight: 600; font-size: 13px; transition: all 0.2s ease; flex: 1; }
    .db-btn-primary { background: linear-gradient(135deg, #E100FF 0%, #7F00FF 100%); color: white; box-shadow: 0 4px 15px rgba(127, 0, 255, 0.3); }
    .db-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(127, 0, 255, 0.4); }
    .db-btn-secondary { background: rgba(255,255,255,0.1); color: white; }
    .db-btn-secondary:hover { background: rgba(255,255,255,0.2); }
    .db-sh { margin: 14px 0; padding: 12px; border-radius: 10px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); font-size: 12px; line-height: 1.45; }
    .db-sh-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.85; margin-bottom: 8px; }
    .db-sh-verdict { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
    .db-sh-ok { color: #2ed573; }
    .db-sh-warn { color: #ffa502; }
    .db-sh-muted { opacity: 0.85; font-size: 11px; }
    .db-topics { margin: 12px 0; padding: 12px; border-radius: 10px; background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.08); font-size: 12px; line-height: 1.45; }
    .db-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .db-tag { display: inline-block; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,0.12); font-size: 11px; }
    .db-row { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); }
    .db-row-title { font-weight: 600; font-size: 12px; margin-bottom: 4px; opacity: 0.95; }
    .db-row-meta { font-size: 10px; opacity: 0.75; margin-bottom: 4px; }
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatPercentile(v) {
    return typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";
  }

  // ===== Render Function =====
  panel.renderData = function (raw) {
    const data = raw != null && typeof raw === "object" ? raw : {};
    const sh = data.submissionHealth;
    const quoteText =
      typeof data.quote === "string" && data.quote.trim() ? data.quote : "Keep going.";

    let submissionBlock = "";
    if (sh && sh.error) {
      submissionBlock = `
        <div class="db-sh">
          <div class="db-sh-title">This problem (LeetCode)</div>
          <div class="db-sh-muted">${escapeHtml(sh.error)}</div>
        </div>`;
    } else if (sh && typeof sh.needsRevisit === "boolean") {
      const verdictClass = sh.needsRevisit ? "db-sh-warn" : "db-sh-ok";
      const verdictLabel = sh.needsRevisit ? "Needs revisit" : "Solid for now";
      const rt = formatPercentile(sh.avgRuntimePercentile);
      const mem = formatPercentile(sh.avgMemoryPercentile);
      const lookedAt = Number.isFinite(Number(sh.lookedAt)) ? Number(sh.lookedAt) : 0;
      const acc = Number.isFinite(Number(sh.acceptedCount)) ? Number(sh.acceptedCount) : 0;
      submissionBlock = `
        <div class="db-sh">
          <div class="db-sh-title">This problem — last ${lookedAt} submission(s)</div>
          <div class="db-sh-verdict ${verdictClass}">${verdictLabel}</div>
          <div class="db-sh-muted">Accepted: ${acc}/${lookedAt} · Avg runtime %ile: ${rt} · Avg memory %ile: ${mem}</div>
          <div style="margin-top:8px; font-size:12px;">${escapeHtml(sh.summary || "")}</div>
        </div>`;
    }

    const pti = data.progressTopicInsights;
    let topicsBlock = "";
    if (pti && typeof pti === "object") {
      if (pti.error) {
        topicsBlock = `
          <div class="db-topics">
            <div class="db-sh-title">Topic practice (LeetCode)</div>
            <div class="db-sh-muted">${escapeHtml(pti.error)}</div>
          </div>`;
      } else {
        const seven = Array.isArray(pti.last7DaysTopics) ? pti.last7DaysTopics : [];
        const sevenLines =
          seven.length === 0
            ? `<div class="db-sh-muted">No AC solves in the last 7 days in your progress list (or still loading).</div>`
            : seven
                .map(
                  t =>
                    `<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px;"><span>${escapeHtml(t.name)}</span><span class="db-sh-muted">${t.count}×</span></div>`
                )
                .join("");

        const last10 = Array.isArray(pti.last10) ? pti.last10 : [];
        const tenRows = last10
          .map((row, i) => {
            const tags = (row.topicTags || [])
              .map(tag => `<span class="db-tag">${escapeHtml(tag.name || tag.slug || "")}</span>`)
              .join("");
            const status = [row.questionStatus, row.lastResult].filter(Boolean).join(" · ");
            return `
              <div class="db-row">
                <div class="db-row-title">${i + 1}. ${escapeHtml(row.title)}</div>
                <div class="db-row-meta">${escapeHtml(status)}</div>
                <div class="db-tags">${tags || `<span class="db-sh-muted">No tags</span>`}</div>
              </div>`;
          })
          .join("");

        topicsBlock = `
          <div class="db-topics">
            <div class="db-sh-title">Topics — solved (last 7 days)</div>
            <div class="db-sh-muted" style="margin-bottom:6px;">Counts how many problems you marked SOLVED with last result AC, where the last submission was within 7 days. Tags on a problem each add +1.</div>
            ${sevenLines}
          </div>
          <div class="db-topics">
            <div class="db-sh-title">Last 10 problems (by recent activity)</div>
            <div class="db-sh-muted" style="margin-bottom:6px;">Topic tags from your 10 most recently touched problems on the progress list.</div>
            ${tenRows || `<div class="db-sh-muted">No data.</div>`}
          </div>`;
      }
    }

    panel.innerHTML = `
      <div class="db-header">LeetCode Progress</div>

      <div class="db-quote">"${escapeHtml(quoteText)}"</div>

      ${submissionBlock}

      ${topicsBlock}

      <div class="db-footer">
        <button id="goNext" class="db-btn db-btn-primary">Stuck!!! Take Some Hint 😗</button>
        <button id="close1" class="db-btn db-btn-secondary">Close</button>
      </div>
    `;
  };

  return panel;
};
// ===== Chat Panel =====
window.createChatWindow = function () {
  const panel = document.createElement("div");

  Object.assign(panel.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "360px",
    height: "400px",
    background:
      "linear-gradient(135deg, rgba(20, 20, 24, 0.92) 0%, rgba(30, 30, 46, 0.86) 100%)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    color: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.32)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    zIndex: "10000",
    display: "none",
    padding: "18px",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    overflow: "hidden"
  });

  const style = document.createElement("style");
  style.textContent = `
    .lc-chat-header { font-size: 18px; font-weight: 800; margin-bottom: 10px; letter-spacing: 0.2px; }
    .lc-chat-sub { font-size: 12px; opacity: 0.75; margin-bottom: 12px; line-height: 1.4; }
    .lc-chat-messages { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px; height: 220px; overflow-y: auto; }
    .lc-chat-messages::-webkit-scrollbar { width: 4px; }
    .lc-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
    .lc-msg { font-size: 13px; line-height: 1.45; margin: 0 0 10px 0; }
    .lc-msg:last-child { margin-bottom: 0; }
    .lc-msg-role { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-bottom: 2px; }
    .lc-msg-bubble { background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 8px 10px; white-space: pre-wrap; }
    .lc-chat-footer { display: flex; gap: 10px; margin-top: 12px; }
    .lc-btn { cursor: pointer; border: none; border-radius: 10px; padding: 10px 12px; font-weight: 700; font-size: 13px; transition: all 0.2s ease; }
    .lc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .lc-btn-primary { background: linear-gradient(135deg, #E100FF 0%, #7F00FF 100%); color: #fff; box-shadow: 0 4px 15px rgba(127, 0, 255, 0.28); flex: 1; }
    .lc-btn-secondary { background: rgba(255,255,255,0.12); color: #fff; flex: 0 0 auto; }
  `;
  document.head.appendChild(style);

  panel.innerHTML = `
    <div class="lc-chat-header">Mentor</div>
    <div class="lc-chat-sub">
      Click <b>Get Hint</b> to receive a deeper conceptual nudge (max 5). After that, you’ll get a <b>Show Solution</b> option.
    </div>

    <div id="chatMessages" class="lc-chat-messages">
      <div class="lc-msg">
        <div class="lc-msg-role">System</div>
        <div class="lc-msg-bubble">When you’re stuck, ask for a hint. I’ll keep it conceptual and avoid spoiling the full approach.</div>
      </div>
    </div>

    <div class="lc-chat-footer">
      <button id="goBack" class="lc-btn lc-btn-secondary">Back</button>
      <button id="hintAction" class="lc-btn lc-btn-primary">Get Hint (0/5)</button>
      <button id="close2" class="lc-btn lc-btn-secondary">Close</button>
    </div>
  `;

  document.body.appendChild(panel);
  return panel;
};
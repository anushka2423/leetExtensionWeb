// ===== Chat Panel =====
window.createChatWindow = function () {
  const panel = document.createElement("div");

  Object.assign(panel.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "300px",
    height: "200px",
    background: "#1e1e1e",
    color: "#ffffff",  
    borderRadius: "10px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    zIndex: "10000",
    display: "none",
    padding: "15px"
  });

  panel.innerHTML = `
    <h3>Second Popup</h3>
    <p>This is another view</p>
    <button id="goBack">Back</button>
    <button id="close2">Close</button>
  `;

  document.body.appendChild(panel);
  return panel;
};
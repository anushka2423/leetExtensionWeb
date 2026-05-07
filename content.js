// ===== Floating Button =====
const button = document.createElement("div");
button.innerText = "🤖";

Object.assign(button.style, {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  width: "60px",
  height: "60px",
  borderRadius: "50%",
  background: "#4CAF50",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  cursor: "pointer",
  zIndex: "9999",
  boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  animation: "bounce 1s infinite alternate"
});

// animation
const style = document.createElement("style");
style.innerHTML = `
@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-10px); }
}
`;
document.head.appendChild(style);

// ===== Panels =====
const dashboard = window.createDashboard();
const chat = window.createChatWindow();

document.body.appendChild(button);

// ===== STATE =====
let startTime = 0;
let attempts = 0;
let meta = null;

// ===== Helpers =====
function pauseAnimation() {
  button.style.animationPlayState = "paused";
}

function resumeAnimation() {
  button.style.animationPlayState = "running";
}

function getTitleSlug() {
  return window.location.pathname.split("/")[2];
}

// ===== GraphQL =====
async function fetchProblemDetails(slug) {
  const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        topicTags {
          name
        }
      }
    }
  `;

  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { titleSlug: slug }
    })
  });

  const data = await res.json();
  return data.data.question;
}

// ===== INIT =====
async function initTracking() {
  const slug = getTitleSlug();
  meta = await fetchProblemDetails(slug);

  startTime = Date.now();
  attempts = 0;

  console.log("Tracking:", meta);
}

setTimeout(initTracking, 2000);

// ===== TEMP attempt tracking =====
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    attempts++;
    console.log("Attempt:", attempts);
  }
});

// ===== Send Data =====
async function sendData(status = "unsolved") {
  if (!meta) return;

  const timeSpent = Math.floor((Date.now() - startTime) / 1000);

  const payload = {
    problemId: meta.questionId,
    title: meta.title,
    topic: meta.topicTags[0]?.name || "Unknown",
    timeSpent,
    attempts,
    status
  };

  console.log("Sending:", payload);

  await fetch("http://localhost:5000/api/save-problem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

// send on leave
window.addEventListener("beforeunload", () => {
  sendData("unsolved");
});

// ===== Load Dashboard =====
async function loadDashboard() {
  const res = await fetch("http://localhost:5000/api/stats");
  const data = await res.json();

  dashboard.renderData(data);
}

// ===== Events =====
button.addEventListener("click", () => {
  loadDashboard();
  dashboard.style.display = "block";
  chat.style.display = "none";
  pauseAnimation();
});

dashboard.addEventListener("click", (e) => {
  if (e.target.id === "goNext") {
    dashboard.style.display = "none";
    chat.style.display = "block";
  }

  if (e.target.id === "close1") {
    dashboard.style.display = "none";
    resumeAnimation();
  }
});

chat.addEventListener("click", (e) => {
  if (e.target.id === "goBack") {
    chat.style.display = "none";
    dashboard.style.display = "block";
  }

  if (e.target.id === "close2") {
    chat.style.display = "none";
    resumeAnimation();
  }
});
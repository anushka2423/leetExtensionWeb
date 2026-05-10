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
let hintsUsed = 0;
let previousHints = [];
let hintInFlight = false;

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

function setHintButtonState() {
  const btn = chat.querySelector("#hintAction");
  if (!btn) return;

  if (hintInFlight) {
    btn.disabled = true;
    btn.textContent = "Getting hint...";
    return;
  }

  if (hintsUsed >= 5) {
    btn.disabled = false;
    btn.textContent = "Show Solution";
    return;
  }

  btn.disabled = false;
  btn.textContent = `Get Hint (${hintsUsed}/5)`;
}

function appendChatMessage(role, text) {
  const box = chat.querySelector("#chatMessages");
  if (!box) return;

  const wrapper = document.createElement("div");
  wrapper.className = "lc-msg";

  const roleEl = document.createElement("div");
  roleEl.className = "lc-msg-role";
  roleEl.textContent = role;

  const bubble = document.createElement("div");
  bubble.className = "lc-msg-bubble";
  bubble.textContent = text;

  wrapper.appendChild(roleEl);
  wrapper.appendChild(bubble);
  box.appendChild(wrapper);
  box.scrollTop = box.scrollHeight;
}

function getBestEffortProblemDescription() {
  // LeetCode DOM changes frequently; try multiple selectors.
  const candidates = [
    '[data-track-load="description_content"]',
    '[data-cy="question-detail"]',
    ".question-content__JfgR",
    ".content__u3I1"
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el && el.innerText && el.innerText.trim().length > 40) return el.innerText.trim();
  }
  return "";
}

function getBestEffortConstraints() {
  // Constraints are usually a section in the description; keep it lightweight.
  const desc = getBestEffortProblemDescription();
  const m = desc.match(/Constraints:\s*([\s\S]*)$/i);
  return m ? String(m[1]).trim().slice(0, 1500) : "";
}

function getBestEffortLanguage() {
  const candidates = [
    '[data-cy="lang-select"]',
    'button[aria-label*="Language"]',
    'button[aria-label*="language"]'
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el && el.innerText && el.innerText.trim()) return el.innerText.trim();
  }
  return "";
}

function getBestEffortCurrentCode() {
  try {
    if (window.monaco && window.monaco.editor && typeof window.monaco.editor.getModels === "function") {
      const models = window.monaco.editor.getModels();
      if (Array.isArray(models) && models.length) {
        let best = "";
        for (const m of models) {
          const v = m && typeof m.getValue === "function" ? m.getValue() : "";
          if (v && v.trim().length > best.trim().length) best = v;
        }
        if (best && best.trim()) return best;
      }
    }
  } catch (_) {}

  // Fallback: try common editor textareas (rare on LeetCode now).
  const ta = document.querySelector("textarea");
  if (ta && ta.value && ta.value.trim()) return ta.value;

  // Monaco DOM fallback: reconstruct from rendered view lines.
  // Works when Monaco models are not accessible in the content script.
  try {
    const root =
      document.querySelector(".monaco-editor .view-lines") ||
      document.querySelector(".view-lines.monaco-mouse-cursor-text");
    if (root) {
      const lines = Array.from(root.querySelectorAll(".view-line")).map((lineEl) => {
        const t = (lineEl.textContent || "").replace(/\u00a0/g, ""); // NBSPs are used for indentation
        return t.replace(/\s+$/g, ""); // trim end only
      });
      const joined = lines.join("\n").trimEnd();
      if (joined.trim().length) return joined;
    }
  } catch (_) {}

  return "";
}

async function requestHintFromBackend() {
  if (hintInFlight) return;

  hintInFlight = true;
  setHintButtonState();

  const payload = {
    problemTitle: meta?.title || "",
    problemDescription: getBestEffortProblemDescription(),
    constraints: getBestEffortConstraints(),
    language: getBestEffortLanguage(),
    currentCode: getBestEffortCurrentCode(),
    previousCode: "",
    previousHints,
    hintLevel: Math.min(4, Math.max(1, hintsUsed + 1)),
    compileErrors: [],
    runtimeErrors: [],
    userQuestion: ""
  };

  try {
    const res = await fetch("http://localhost:8000/api/generate-hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }

    if (!res.ok) {
      // Show backend-provided validation errors (400s) in chat.
      const msg =
        (data && (data.error || data.message)) ||
        (res.status >= 500
          ? "Backend error (500). Please check backend logs."
          : `Request failed (${res.status}).`);
      appendChatMessage("Error", msg);
      return;
    }

    const hintMsg = data?.hint?.message;
    if (!hintMsg || !String(hintMsg).trim()) {
      appendChatMessage(
        "Error",
        res.status >= 500
          ? "Backend error (500). Please check backend logs."
          : "No hint returned from backend."
      );
      return;
    }

    previousHints = [...previousHints, hintMsg];
    hintsUsed++;
    appendChatMessage(`Hint ${hintsUsed}`, hintMsg);
  } catch (err) {
    appendChatMessage("Error", "Failed to reach backend. Is it running on http://localhost:8000 ?");
  } finally {
    hintInFlight = false;
    setHintButtonState();
  }
}

function openSolutionPage() {
  const slug = getTitleSlug();
  if (!slug) return;
  const url = `https://leetcode.com/problems/${slug}/solution/`;
  window.open(url, "_blank", "noopener,noreferrer");
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
  hintsUsed = 0;
  previousHints = [];
  hintInFlight = false;
  setHintButtonState();

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

  await fetch("http://localhost:8000/api/save-problem", {
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
  const res = await fetch("http://localhost:8000/api/stats");
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

  if (e.target.id === "hintAction") {
    if (hintsUsed >= 5) {
      appendChatMessage("System", "Opening the official solution in a new tab.");
      openSolutionPage();
    } else {
      requestHintFromBackend();
    }
  }

  if (e.target.id === "close2") {
    chat.style.display = "none";
    resumeAnimation();
  }
});
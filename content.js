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
let solutionAccepted = false;
let solutionInFlight = false;
let acceptedCodeSnapshot = "";
let codeChangeWatcherId = null;

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

  if (solutionInFlight) {
    btn.disabled = true;
    btn.textContent = "Filling solution...";
    return;
  }

  if (solutionAccepted) {
    btn.disabled = true;
    btn.textContent = "Solution is correct ✓";
    return;
  }

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

function resetHintProgressAfterCodeEdit() {
  solutionAccepted = false;
  hintsUsed = 0;
  previousHints = [];
  acceptedCodeSnapshot = "";
  setHintButtonState();
  appendChatMessage("System", "Code changed after correct solution. Hint progress reset to 0.");
}

function startCodeChangeWatcher() {
  if (codeChangeWatcherId) return;
  codeChangeWatcherId = setInterval(() => {
    if (!solutionAccepted || !acceptedCodeSnapshot) return;
    const currentCode = getBestEffortCurrentCode();
    if (!currentCode || !String(currentCode).trim()) return;
    if (String(currentCode).trim() !== String(acceptedCodeSnapshot).trim()) {
      resetHintProgressAfterCodeEdit();
    }
  }, 1200);
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(String(text || ""));
    return true;
  } catch (_) {}

  // Fallback for pages where clipboard API is unavailable.
  try {
    const ta = document.createElement("textarea");
    ta.value = String(text || "");
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch (_) {
    return false;
  }
}

function appendChatMessage(role, text, options = {}) {
  const box = chat.querySelector("#chatMessages");
  if (!box) return;

  const wrapper = document.createElement("div");
  wrapper.className = "lc-msg";

  const roleEl = document.createElement("div");
  roleEl.className = "lc-msg-role";
  roleEl.textContent = role;

  const bubble = document.createElement("div");
  bubble.className = "lc-msg-bubble";
  bubble.style.position = "relative";
  bubble.style.whiteSpace = "pre-wrap";
  bubble.style.wordBreak = "break-word";

  const contentEl = document.createElement("div");
  contentEl.textContent = text;

  const copyText = options.copyText;
  if (copyText && String(copyText).trim()) {
    bubble.style.paddingTop = "30px";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Copy";
    copyBtn.style.position = "absolute";
    copyBtn.style.top = "6px";
    copyBtn.style.right = "8px";
    copyBtn.style.border = "1px solid rgba(255,255,255,0.25)";
    copyBtn.style.background = "rgba(255,255,255,0.08)";
    copyBtn.style.color = "#fff";
    copyBtn.style.borderRadius = "6px";
    copyBtn.style.fontSize = "11px";
    copyBtn.style.padding = "2px 8px";
    copyBtn.style.cursor = "pointer";

    copyBtn.addEventListener("click", async () => {
      const copied = await copyTextToClipboard(copyText);
      copyBtn.textContent = copied ? "Copied" : "Copy failed";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1400);
    });

    bubble.appendChild(copyBtn);
  }

  bubble.appendChild(contentEl);

  wrapper.appendChild(roleEl);
  wrapper.appendChild(bubble);
  box.appendChild(wrapper);
  box.scrollTop = box.scrollHeight;
}

// We still trust backend as source-of-truth for locking hints,
// but we send best-effort submission status from DOM to help backend decide.

function mapStatusFromText(rawText) {
  const t = String(rawText || "").toLowerCase();
  if (!t) return "Unknown";
  if (/\baccepted\b/.test(t)) return "Accepted";
  if (/wrong answer/.test(t)) return "Wrong Answer";
  if (/runtime error/.test(t)) return "Runtime Error";
  if (/compile error|compilation error/.test(t)) return "Compile Error";
  if (/time limit exceeded/.test(t)) return "Time Limit Exceeded";
  if (/memory limit exceeded/.test(t)) return "Memory Limit Exceeded";
  return "Unknown";
}

function getBestEffortExecutionStatus() {
  const candidates = [
    '[data-e2e-locator="submission-result"]',
    '[data-e2e-locator="console-result"]',
    '[data-cy="submission-result"]',
    '.text-green-s',
    '.text-red-s',
    '.text-yellow-s'
  ];

  for (const sel of candidates) {
    const nodes = Array.from(document.querySelectorAll(sel));
    for (const node of nodes) {
      const mapped = mapStatusFromText(node?.innerText || node?.textContent || "");
      if (mapped !== "Unknown") return mapped;
    }
  }

  // Broad fallback: inspect likely result containers only (avoid whole-page noise).
  const containerCandidates = [
    '[class*="result"]',
    '[class*="Result"]',
    '[data-e2e-locator*="result"]',
    '[data-cy*="result"]'
  ];
  for (const sel of containerCandidates) {
    const nodes = Array.from(document.querySelectorAll(sel)).slice(0, 40);
    for (const node of nodes) {
      const mapped = mapStatusFromText(node?.innerText || node?.textContent || "");
      if (mapped !== "Unknown") return mapped;
    }
  }

  return "Unknown";
}

function setBestEffortEditorCode(newCode) {
  const code = String(newCode || "");
  if (!code.trim()) return false;

  try {
    if (window.monaco && window.monaco.editor && typeof window.monaco.editor.getModels === "function") {
      const models = window.monaco.editor.getModels();
      if (Array.isArray(models) && models.length) {
        // Pick the "largest" model to avoid overwriting small scratch buffers.
        let best = models[0];
        for (const m of models) {
          const v = m && typeof m.getValue === "function" ? m.getValue() : "";
          const bestV = best && typeof best.getValue === "function" ? best.getValue() : "";
          if (String(v || "").length >= String(bestV || "").length) best = m;
        }
        if (best && typeof best.setValue === "function") {
          best.setValue(code);
          return true;
        }
      }
    }
  } catch (_) {}

  // If Monaco models aren’t accessible from the content script, we can’t safely autofill.
  return false;
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
  const normalize = (s) =>
    String(s || "")
      .replace(/\s+/g, " ")
      .trim();

  const extractFirstToken = (s) => {
    const t = normalize(s);
    if (!t) return "";
    // Often the language button text is like: "Java" or "Java Auto"
    // We only need the language name (first token).
    return t.split(" ")[0];
  };

  // 1) Older selectors (kept for compatibility).
  const legacyCandidates = [
    '[data-cy="lang-select"]',
    'button[aria-label*="Language"]',
    'button[aria-label*="language"]'
  ];
  for (const sel of legacyCandidates) {
    const el = document.querySelector(sel);
    const lang = extractFirstToken(el?.innerText);
    if (lang) return lang;
  }

  // 2) New LeetCode UI: language picker is a dialog trigger with the language as the first text.
  // Example: <button aria-haspopup="dialog" ...>Java <chevron/></button>
  const dialogButtons = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]'));
  const known = new Set([
    "C++",
    "C",
    "Java",
    "Python",
    "Python3",
    "JavaScript",
    "TypeScript",
    "C#",
    "Go",
    "Rust",
    "Kotlin",
    "Swift",
    "PHP",
    "Ruby",
    "Scala",
    "Dart"
  ]);

  for (const btn of dialogButtons) {
    const raw = normalize(btn?.innerText);
    if (!raw) continue;
    // Skip non-language dialogs
    if (raw.length > 24) continue;
    if (/^Auto$/i.test(raw)) continue;

    const token = extractFirstToken(raw);
    if (known.has(token)) return token;
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
    userQuestion: "",
    executionStatus: getBestEffortExecutionStatus(),
    optimizationNeeded: false
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

    const isCorrectAnswer =
      Boolean(data?.isCorrectAnswer) ||
      Boolean(data?.meta?.isCorrectAnswer) ||
      Boolean(data?.meta?.solutionCorrect);

    if (isCorrectAnswer) {
      solutionAccepted = true;
      acceptedCodeSnapshot = getBestEffortCurrentCode();
      appendChatMessage("System", hintMsg);
      setHintButtonState();
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

async function requestSolutionFromBackend() {
  if (solutionInFlight) return;

  solutionInFlight = true;
  setHintButtonState();

  const payload = {
    problemTitle: meta?.title || "",
    problemDescription: getBestEffortProblemDescription(),
    constraints: getBestEffortConstraints(),
    language: getBestEffortLanguage()
  };

  try {
    const res = await fetch("http://localhost:8000/api/generate-solution", {
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
      const msg =
        (data && (data.error || data.message)) ||
        (res.status >= 500
          ? "Backend error (500). Please check backend logs."
          : `Request failed (${res.status}).`);
      appendChatMessage("Error", msg);
      return;
    }

    const solutionCode = data?.solutionCode;
    if (!solutionCode || !String(solutionCode).trim()) {
      appendChatMessage("Error", "No solution code returned from backend.");
      return;
    }

    const filled = setBestEffortEditorCode(solutionCode);
    if (filled) {
      solutionAccepted = true;
      acceptedCodeSnapshot = solutionCode;
      appendChatMessage("System", "Solution filled into the editor.");
      setHintButtonState();
      return;
    }

    // Fallback: if we can't set Monaco code, show solution directly in chat.
    appendChatMessage(
      "System",
      "I generated the solution but couldn’t auto-fill your editor. Here is the full solution:"
    );
    appendChatMessage("Solution", solutionCode, { copyText: solutionCode });
  } catch (err) {
    appendChatMessage("Error", "Failed to reach backend. Is it running on http://localhost:8000 ?");
  } finally {
    solutionInFlight = false;
    setHintButtonState();
  }
}

// ===== GraphQL =====
function getLeetcodeCsrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function leetcodeGraphql(payload) {
  const csrf = getLeetcodeCsrfToken();
  const headers = {
    "Content-Type": "application/json",
    ...(csrf ? { "x-csrftoken": csrf } : {})
  };
  if (payload.operationName) {
    headers["x-operation-name"] = payload.operationName;
  }

  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload)
  });

  return res.json();
}

const USER_PROGRESS_QUESTION_LIST_QUERY = `
  query userProgressQuestionList($filters: UserProgressQuestionListInput) {
    userProgressQuestionList(filters: $filters) {
      totalNum
      questions {
        translatedTitle
        frontendId
        title
        titleSlug
        difficulty
        lastSubmittedAt
        numSubmitted
        questionStatus
        lastResult
        topicTags {
          name
          nameTranslated
          slug
        }
      }
    }
  }
`;

function parseLeetcodeProgressAt(iso) {
  if (iso == null || iso === "") return null;
  const t = Date.parse(String(iso));
  return Number.isFinite(t) ? t : null;
}

/**
 * Paginates user progress (recent activity first). Stops when a full page is entirely older than `olderThanMs` (optional).
 */
async function fetchUserProgressQuestions(options = {}) {
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 50));
  const olderThanMs = options.olderThanMs;
  const maxPages = Math.min(40, Math.max(1, Number(options.maxPages) || 40));

  const collected = [];
  let totalNum = 0;
  let skip = 0;

  for (let page = 0; page < maxPages; page++) {
    const json = await leetcodeGraphql({
      operationName: "userProgressQuestionList",
      query: USER_PROGRESS_QUESTION_LIST_QUERY,
      variables: { filters: { skip, limit } }
    });

    if (json?.errors?.length) {
      const msg = json.errors[0]?.message || "Progress query failed";
      throw new Error(msg);
    }

    const block = json?.data?.userProgressQuestionList;
    if (!block || !Array.isArray(block.questions)) {
      throw new Error("Unexpected progress response");
    }

    totalNum = typeof block.totalNum === "number" ? block.totalNum : totalNum;
    const batch = block.questions;
    collected.push(...batch);

    if (batch.length < limit) break;
    if (skip + batch.length >= totalNum) break;

    if (typeof olderThanMs === "number") {
      const times = batch
        .map(q => parseLeetcodeProgressAt(q?.lastSubmittedAt))
        .filter(t => t != null);
      if (times.length && times.every(t => t < olderThanMs)) break;
    }

    skip += limit;
  }

  return { totalNum, questions: collected };
}

function buildProgressTopicInsights(questions, nowMs = Date.now()) {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const windowStart = nowMs - sevenDaysMs;

  const topicCounts = new Map();
  for (const q of questions) {
    if (!q || q.questionStatus !== "SOLVED") continue;
    if (String(q.lastResult || "").toUpperCase() !== "AC") continue;
    const ts = parseLeetcodeProgressAt(q.lastSubmittedAt);
    if (ts == null || ts < windowStart) continue;
    const tags = Array.isArray(q.topicTags) ? q.topicTags : [];
    for (const tag of tags) {
      const name = (tag && tag.name) || "";
      const slug = (tag && tag.slug) || name;
      if (!name && !slug) continue;
      const key = slug || name;
      const prev = topicCounts.get(key) || { name: name || slug, slug: slug || key, count: 0 };
      prev.count += 1;
      if (name) prev.name = name;
      topicCounts.set(key, prev);
    }
  }

  const last7DaysTopics = [...topicCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const last10 = questions.slice(0, 10).map(q => ({
    title: q?.title || "Unknown",
    titleSlug: q?.titleSlug || "",
    questionStatus: q?.questionStatus || "",
    lastResult: q?.lastResult || "",
    lastSubmittedAt: q?.lastSubmittedAt || "",
    topicTags: Array.isArray(q?.topicTags)
      ? q.topicTags.map(t => ({ name: (t && t.name) || "", slug: (t && t.slug) || "" })).filter(t => t.name || t.slug)
      : []
  }));

  return { last7DaysTopics, last10 };
}

async function loadProgressTopicInsights() {
  try {
    const { questions } = await fetchUserProgressQuestions({
      olderThanMs: Date.now() - 7 * 24 * 60 * 60 * 1000
    });
    return buildProgressTopicInsights(questions);
  } catch (err) {
    return {
      error: String(err?.message || err || "Could not load progress topics"),
      last7DaysTopics: [],
      last10: []
    };
  }
}

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

  const data = await leetcodeGraphql({
    operationName: "getQuestionDetail",
    query,
    variables: { titleSlug: slug }
  });

  return data.data.question;
}

const SUBMISSION_DETAILS_QUERY = `
  query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      runtimePercentile
      memoryPercentile
      runtimeDisplay
      memoryDisplay
      statusCode
      timestamp
    }
  }
`;

const QUESTION_SUBMISSION_LIST_QUERY = `
  query submissionList($questionSlug: String!, $offset: Int!, $limit: Int!, $lastKey: String) {
    questionSubmissionList(
      questionSlug: $questionSlug
      offset: $offset
      limit: $limit
      lastKey: $lastKey
    ) {
      lastKey
      hasNext
      submissions {
        id
        status
        statusDisplay
        timestamp
      }
    }
  }
`;

const LEGACY_SUBMISSION_LIST_QUERY = `
  query submissions($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!) {
    submissionList(offset: $offset, limit: $limit, lastKey: $lastKey, questionSlug: $questionSlug) {
      lastKey
      hasNext
      submissions {
        id
        status
        statusDisplay
        timestamp
      }
    }
  }
`;

function parseSubmissionListEnvelope(json) {
  const d = json?.data;
  if (!d) return null;
  if (d.questionSubmissionList) return d.questionSubmissionList;
  if (d.submissionList) return d.submissionList;
  return null;
}

async function fetchRecentSubmissionIds(slug, limit = 3) {
  let json = await leetcodeGraphql({
    operationName: "submissionList",
    query: QUESTION_SUBMISSION_LIST_QUERY,
    variables: { questionSlug: slug, offset: 0, limit, lastKey: null }
  });

  let envelope = parseSubmissionListEnvelope(json);
  if (!envelope && Array.isArray(json?.errors)) {
    json = await leetcodeGraphql({
      operationName: "submissions",
      query: LEGACY_SUBMISSION_LIST_QUERY,
      variables: { offset: 0, limit, lastKey: null, questionSlug: slug }
    });
    envelope = parseSubmissionListEnvelope(json);
  }

  if (!envelope) {
    const msg = json?.errors?.[0]?.message || "Could not read submission list";
    throw new Error(msg);
  }

  const raw = envelope.submissions;
  if (raw == null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return [];
  }

  const sorted = [...raw].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  return sorted.slice(0, limit).map(s => String(s.id));
}

async function fetchSubmissionDetails(submissionId) {
  const sid = Number(submissionId);
  if (!Number.isFinite(sid)) return null;

  const json = await leetcodeGraphql({
    operationName: "submissionDetails",
    query: SUBMISSION_DETAILS_QUERY,
    variables: { submissionId: sid }
  });

  if (json?.errors?.length) return null;
  return json?.data?.submissionDetails || null;
}

function isAcceptedStatusCode(code) {
  return Number(code) === 10;
}

function mean(nums) {
  const n = nums.filter(v => typeof v === "number" && !Number.isNaN(v));
  if (!n.length) return null;
  return n.reduce((a, b) => a + b, 0) / n.length;
}

/**
 * Uses up to the last 3 submissions: verdict "needs revisit" if any are not Accepted,
 * or accepted runs are clearly below typical performance (percentile vs other users).
 */
function evaluateLastSubmissionsHealth(detailsList) {
  const list = Array.isArray(detailsList) ? detailsList.filter(Boolean) : [];
  const n = list.length;

  if (!n) {
    return {
      lookedAt: 0,
      acceptedCount: 0,
      avgRuntimePercentile: null,
      avgMemoryPercentile: null,
      rows: [],
      needsRevisit: false,
      summary: "No recent submissions found for this problem."
    };
  }

  const rows = list.map(d => ({
    statusCode: d.statusCode,
    accepted: isAcceptedStatusCode(d.statusCode),
    runtimePercentile: typeof d.runtimePercentile === "number" ? d.runtimePercentile : null,
    memoryPercentile: typeof d.memoryPercentile === "number" ? d.memoryPercentile : null,
    runtimeDisplay: d.runtimeDisplay || "",
    memoryDisplay: d.memoryDisplay || ""
  }));

  const acceptedCount = rows.filter(r => r.accepted).length;
  const acceptedRows = rows.filter(r => r.accepted);

  const avgRuntimePercentile = mean(acceptedRows.map(r => r.runtimePercentile));
  const avgMemoryPercentile = mean(acceptedRows.map(r => r.memoryPercentile));

  const reasons = [];
  let needsRevisit = false;

  if (acceptedCount < n) {
    needsRevisit = true;
    reasons.push(`${n - acceptedCount} of the last ${n} not Accepted`);
  }

  if (acceptedRows.length > 0) {
    const lowRt = avgRuntimePercentile != null && avgRuntimePercentile < 35;
    const lowMem = avgMemoryPercentile != null && avgMemoryPercentile < 35;
    if (lowRt || lowMem) {
      needsRevisit = true;
      if (lowRt) reasons.push("runtime beats fewer than ~35% of submissions on average");
      if (lowMem) reasons.push("memory beats fewer than ~35% of submissions on average");
    }
  }

  const summary = needsRevisit
    ? `Needs revisit — ${reasons.join("; ")}.`
    : `On track — ${acceptedCount}/${n} Accepted in your last ${n}; runtime/memory percentiles look reasonable.`;

  return {
    lookedAt: n,
    acceptedCount,
    avgRuntimePercentile,
    avgMemoryPercentile,
    rows,
    needsRevisit,
    reasons,
    summary
  };
}

async function analyzeCurrentProblemSubmissions() {
  const slug = getTitleSlug();
  if (!slug) throw new Error("No problem slug in URL");

  const ids = await fetchRecentSubmissionIds(slug, 3);
  if (!ids.length) {
    return evaluateLastSubmissionsHealth([]);
  }

  const details = await Promise.all(ids.map(id => fetchSubmissionDetails(id)));
  if (ids.length && !details.some(Boolean)) {
    throw new Error("Could not load submission details (try signing in to LeetCode or refreshing).");
  }

  return evaluateLastSubmissionsHealth(details);
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
  solutionAccepted = false;
  solutionInFlight = false;
  acceptedCodeSnapshot = "";
  setHintButtonState();

  console.log("Tracking:", meta);
}

setTimeout(initTracking, 2000);
startCodeChangeWatcher();

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
  let data = {};
  try {
    const res = await fetch("http://localhost:8000/api/stats");
    if (res.ok) {
      const parsed = await res.json();
      if (parsed && typeof parsed === "object") {
        data = parsed;
      }
    }
  } catch (_) {
    data = {};
  }

  let submissionHealth = null;
  try {
    submissionHealth = await analyzeCurrentProblemSubmissions();
  } catch (err) {
    submissionHealth = {
      error: String(err?.message || err || "Failed to load submission stats"),
      needsRevisit: null
    };
  }

  const progressTopicInsights = await loadProgressTopicInsights();

  dashboard.renderData({
    quote: "Keep going.",
    totalProblems: 0,
    ...data,
    submissionHealth,
    progressTopicInsights
  });
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
      appendChatMessage("System", "Generating the full solution and filling it into the editor...");
      void requestSolutionFromBackend().catch(() => {
        appendChatMessage("Error", "Unexpected error while generating solution.");
      });
    } else {
      void requestHintFromBackend().catch(() => {
        appendChatMessage("Error", "Unexpected error while requesting hint.");
      });
    }
  }

  if (e.target.id === "close2") {
    chat.style.display = "none";
    resumeAnimation();
  }
});
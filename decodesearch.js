let rules = [];

const searchBox = document.getElementById("searchBox");
const resultsDiv = document.getElementById("results");
const responseText = document.getElementById("responseText");

const answerBtn = document.getElementById("answerModeBtn");
const answerPanel = document.getElementById("answerPanel");

let answerMode = false;

// =========================
// STOP WORDS
// =========================

const stopWords = new Set([
  "the","is","a","an","what","how","why","can",
  "do","does","did","for","to","of","in",
  "on","with","and","or","be","been","are","was","were",
  "i","you","we","they","it","this","that",
  "my","your","me","about"
]);

// =========================
// SYNONYMS
// =========================

const synonyms = {
  robot: ["bot", "machine"],
  size: ["dimensions", "big", "large", "height", "width", "length"],
  penalty: ["foul", "violation", "card", "dq"],
  alliance: ["captain", "draft", "partner", "selection"],
  score: ["points", "scoring", "earn"],
  autonomous: ["auto"],
  driver: ["teleop", "manual"],
  legal: ["allowed", "permitted"],
  illegal: ["banned", "not allowed"],
  limit: ["restriction", "constraint"]
};

// =========================
// LOAD RULES
// =========================

fetch("decoderules.json")
  .then(res => res.json())
  .then(data => {
    rules = data;
  })
  .catch(err => {
    console.error(err);
    resultsDiv.innerHTML = "❌ Failed to load rules.";
  });

// =========================
// HELPERS
// =========================

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text, words) {
  if (!text || !words.length) return text;

  let output = text;

  words.forEach(word => {
    const regex = new RegExp(`(${escapeRegex(word)})`, "gi");
    output = output.replace(regex, "<mark>$1</mark>");
  });

  return output;
}

function extractWords(query) {

  let words = query
    .toLowerCase()
    .replace(/[^\w\s.]/g, "")
    .split(/\s+/)
    .filter(w =>
      w.length > 1 &&
      !stopWords.has(w)
    );

  let expanded = [...words];

  words.forEach(word => {

    if (synonyms[word]) {
      expanded.push(...synonyms[word]);
    }

    Object.keys(synonyms).forEach(key => {
      if (synonyms[key].includes(word)) {
        expanded.push(key);
      }
    });

  });

  return [...new Set(expanded)];
}

// =========================
// SCORING
// =========================

function scoreRules(words) {

  return rules.map(rule => {

    const blob = `${rule.id} ${rule.title} ${rule.text}`.toLowerCase();

    let score = 0;

    words.forEach(word => {

      if (blob.includes(word)) score += 2;
      if ((rule.title || "").toLowerCase().includes(word)) score += 5;
      if (String(rule.id || "").toLowerCase().includes(word)) score += 10;

    });

    return { rule, score };

  }).sort((a, b) => b.score - a.score);
}

// =========================
// ANSWER ENGINE
// =========================

function generateAnswer(rule) {

  const full = `${rule.id} ${rule.title} ${rule.text}`.toLowerCase();

  if (full.includes("alliance") && (full.includes("selection") || full.includes("captain"))) {
    return "This rule explains alliance selection and drafting.";
  }

  if (full.includes("size") || full.includes("dimension")) {
    return "This rule defines robot size limits.";
  }

  if (full.includes("penalty") || full.includes("foul")) {
    return "This rule explains penalties and violations.";
  }

  if (full.includes("score")) {
    return "This rule explains scoring.";
  }

  if (full.includes("autonomous")) {
    return "This rule applies to autonomous play.";
  }

  if (full.includes("teleop") || full.includes("driver")) {
    return "This rule applies to driver control.";
  }

  return `This rule explains FTC requirements for ${rule.title}.`;
}

// =========================
// SEARCH
// =========================

searchBox.addEventListener("input", () => {

  const query = searchBox.value.trim();

  resultsDiv.innerHTML = "";
  responseText.innerHTML = "";

  if (!query || !rules.length) return;

  const words = extractWords(query);
  const scored = scoreRules(words);
  const filtered = scored.filter(x => x.score > 0);

  if (!filtered.length) {
    responseText.innerHTML = "Found <b>0</b> results";
    resultsDiv.innerHTML = `<div class="no-results">No results found</div>`;
    return;
  }

  const topRule = filtered[0].rule;

  responseText.innerHTML = `Found <b>${filtered.length}</b> result(s)`;

  // TOP RESULT
  resultsDiv.innerHTML += `
    <div class="result top" data-id="${topRule.id}">
      <h2>Most Relevant Rule</h2>
      <h3>${topRule.id} ${topRule.title}</h3>
      <p>${highlight(topRule.text, words)}</p>

      <button class="add-note-btn"
        onclick="addToNotes('${topRule.id}', '${topRule.title}')">
        Add to Notes +
      </button>
    </div>
  `;

  // OTHER RESULTS
  filtered.forEach(item => {
    if (item.rule.id === topRule.id) return;

    resultsDiv.innerHTML += `
      <div class="result" data-id="${item.rule.id}">
        <h3>${item.rule.id} ${item.rule.title}</h3>
        <p>${highlight(item.rule.text, words)}</p>

        <button class="add-note-btn"
          onclick="addToNotes('${item.rule.id}', '${item.rule.title}')">
          Add to Notes +
        </button>
      </div>
    `;
  });

});

// =========================
// ANSWER MODE
// =========================

answerBtn?.addEventListener("click", () => {
  answerMode = !answerMode;
  answerBtn.innerText = answerMode ? "Answer Mode: ON" : "Answer Mode: OFF";

  if (!answerMode) answerPanel.style.display = "none";
});

// =========================
// RESULT CLICK (ANSWER ONLY)
// =========================

resultsDiv.addEventListener("click", (e) => {

  if (!answerMode) return;

  const card = e.target.closest(".result");
  if (!card) return;

  const rule = rules.find(r => String(r.id) === String(card.dataset.id));
  if (!rule) return;

  answerPanel.style.display = "block";

  answerPanel.innerHTML = `
    <h3>${rule.id} ${rule.title}</h3>
    <hr>
    <p>${generateAnswer(rule)}</p>
  `;
});

// =========================
// SEARCH SHORTCUT
// =========================

window.fillSearch = function(text) {
  searchBox.value = text;
  searchBox.dispatchEvent(new Event("input"));
};

// =========================
// NOTES SYSTEM
// =========================

window.addToNotes = function(id, title) {

  const notesBox = document.getElementById("notesBox");
  const notesSidebar = document.getElementById("notesSidebar");

  if (!notesBox) return;

  // =========================
  // AUTO-OPEN NOTES SIDEBAR
  // =========================
  if (notesSidebar) {
notesSidebar.classList.add("open");
notesBox?.focus();  }

  const entry = `• ${id} — ${title}`;

  let lines = notesBox.value.split("\n").map(l => l.trim());

  if (lines.includes(entry)) return;

  lines.push(entry);

  const newText = lines.filter(Boolean).join("\n");

  notesBox.value = newText;
  localStorage.setItem("ftc_notes", newText);

  const status = document.getElementById("notesStatus");
  if (status) {
    status.textContent = "Saved ✔";
    status.classList.add("show");

    clearTimeout(window.__noteTimer);
    window.__noteTimer = setTimeout(() => {
      status.classList.remove("show");
    }, 800);
  }
};

// =========================
// NOTES SYSTEM INIT FIX
// =========================

document.addEventListener("DOMContentLoaded", () => {

  const notesSidebar = document.getElementById("notesSidebar");
  const notesBox = document.getElementById("notesBox");
  const notesToggleBtn = document.getElementById("notesToggleBtn");
  const clearNotesBtn = document.getElementById("clearNotesBtn");
  const closeNotesBtn = document.getElementById("closeNotesBtn");
  const status = document.getElementById("notesStatus");

  if (!notesSidebar || !notesBox || !notesToggleBtn) return;

  // load saved notes
  notesBox.value = localStorage.getItem("ftc_notes") || "";

  // OPEN / CLOSE SIDEBAR
  notesToggleBtn.addEventListener("click", () => {
    notesSidebar.classList.add("open");
  });

  closeNotesBtn?.addEventListener("click", () => {
    notesSidebar.classList.remove("open");
  });

  // SAVE NOTES
  notesBox.addEventListener("input", () => {
    localStorage.setItem("ftc_notes", notesBox.value);

    if (status) {
      status.textContent = "Added";
      status.classList.add("show");

      clearTimeout(window.__noteTimer);
      window.__noteTimer = setTimeout(() => {
        status.classList.remove("show");
      }, 800);
    }
  });

  // CLEAR NOTES
  clearNotesBtn?.addEventListener("click", () => {
    notesBox.value = "";
    localStorage.removeItem("ftc_notes");
  });

});
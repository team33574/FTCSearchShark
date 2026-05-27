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
  "i","you","we","they","it","this","that","my","your","me","about"
]);

// =========================
// SYNONYMS (RESTORED)
// =========================

const synonyms = {
  robot: ["bot", "machine"],
  size: ["dimensions", "big", "tall", "large", "expand", "height", "width"],
  penalty: ["foul", "violation", "card", "dq"],
  alliance: ["team", "teaming", "partner", "draft"],
  score: ["points", "scoring", "points", "earn"],
  autonomous: ["auto"],
  driver: ["teleop", "tele-op", "manual"],
  legal: ["allowed", "permitted"],
  illegal: ["banned", "not allowed"],
  constraint: ["limit", "restriction"]
};

// =========================
// LOAD RULES
// =========================

fetch("decoderules.json")
  .then(r => r.json())
  .then(data => {
    rules = data;
    console.log("Rules loaded:", rules.length);
  })
  .catch(err => {
    console.error(err);
    resultsDiv.innerHTML = "❌ Failed to load rules.";
  });

// =========================
// UTIL: ESCAPE REGEX
// =========================

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =========================
// HIGHLIGHT
// =========================

function highlight(text, words) {
  if (!text) return "";
  if (!words.length) return text;

  let out = text;

  words.forEach(w => {
    const regex = new RegExp(`(${escapeRegex(w)})`, "gi");
    out = out.replace(regex, "<mark>$1</mark>");
  });

  return out;
}

// =========================
// EXTRACT KEYWORDS + SYNONYMS
// =========================

function extractWords(query) {

  let words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  let expanded = [...words];

  words.forEach(w => {

    // forward synonyms
    if (synonyms[w]) {
      expanded.push(...synonyms[w]);
    }

    // reverse synonyms
    Object.keys(synonyms).forEach(key => {
      if (synonyms[key].includes(w)) {
        expanded.push(key);
      }
    });
  });

  return [...new Set(expanded)];
}

// =========================
// SCORING ENGINE
// =========================

function scoreRules(words) {

  return rules.map(rule => {

    const blob = `${rule.id} ${rule.title} ${rule.text}`.toLowerCase();

    let score = 0;

    words.forEach(w => {
      if (!w) return;

      if (blob.includes(w)) score += 2;
      if ((rule.title || "").toLowerCase().includes(w)) score += 3;
      if (String(rule.id || "").toLowerCase().includes(w)) score += 6;
    });

    return { rule, score };
  }).sort((a, b) => b.score - a.score);
}

// =========================
// ANSWER MODE ENGINE
// =========================

function generateAnswer(rule) {

  const text = (rule.text || "").toLowerCase();
  const title = (rule.title || "").toLowerCase();
  const id = String(rule.id || "").toLowerCase();
  const full = `${id} ${title} ${text}`;


// =========================
// ALLIANCE / DRAFTING (FIXED STRICT)
// =========================

if (
  (full.includes("alliance") &&
   (full.includes("selection") ||
    full.includes("draft") ||
    full.includes("captain") ||
    full.includes("pick"))) ||
  full.includes("4.1") ||
  full.includes("elimination alliance") ||
  full.includes("alliance selection")
) {
  return "This rule explains how alliances are formed, how captains are selected, and how teams are drafted into playoff matchups based on rankings and selection order.";
}

  // =========================
  // ROBOT SIZE
  // =========================

  if (
    full.includes("size") ||
    full.includes("dimension") ||
    full.includes("height") ||
    full.includes("width") ||
    full.includes("length") ||
    full.includes("frame")
  ) {
    return "This rule defines robot size limits and physical construction constraints, including maximum allowed dimensions during inspection and matches.";
  }

  // =========================
  // PENALTIES
  // =========================

  if (
    full.includes("penalty") ||
    full.includes("violation") ||
    full.includes("foul") ||
    full.includes("illegal") ||
    full.includes("dq") ||
    full.includes("card")
  ) {
    return "This rule describes violations of gameplay rules and the penalties, warnings, or disqualifications that result.";
  }

  // =========================
  // SCORING
  // =========================

  if (
    full.includes("score") ||
    full.includes("point") ||
    full.includes("scoring") ||
    full.includes("bonus") ||
    full.includes("earn")
  ) {
    return "This rule explains how points are earned and calculated during match play, including scoring actions and bonuses.";
  }

  // =========================
  // AUTONOMOUS / DRIVER
  // =========================

  if (full.includes("autonomous") || full.includes("auto")) {
    return "This rule applies to the autonomous period, where robots operate without driver input.";
  }

  if (full.includes("teleop") || full.includes("driver") || full.includes("manual")) {
    return "This rule applies to the driver-controlled (teleop) period of the match.";
  }

  // =========================
  // DEFAULT
  // =========================

  return `This rule explains FTC gameplay requirements related to ${rule.title}, including compliance and match regulations.`;
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
    resultsDiv.innerHTML = `<div class="no-results">No results found</div>`;
    responseText.innerHTML = "Found <b>0</b> results";
    return;
  }

  const top = filtered[0].rule;

  responseText.innerHTML = `Found <b>${filtered.length}</b> result(s)`;

  // TOP RESULT
  resultsDiv.innerHTML += `
    <div class="result top" data-id="${top.id}">
      <h2>Most Relevant Rule</h2>
      <h3>${top.id} ${top.title}</h3>
      <p>${highlight(top.text, words)}</p>
    </div>
  `;

  // OTHER RESULTS
  filtered.forEach(x => {
    if (x.rule.id === top.id) return;

    resultsDiv.innerHTML += `
      <div class="result" data-id="${x.rule.id}">
        <h3>${x.rule.id} ${x.rule.title}</h3>
        <p>${highlight(x.rule.text, words)}</p>
      </div>
    `;
  });

});

// =========================
// ANSWER MODE TOGGLE
// =========================

answerBtn?.addEventListener("click", () => {

  answerMode = !answerMode;

  answerBtn.innerText = answerMode
    ? "Answer Mode: ON"
    : "Answer Mode: OFF";

  if (!answerMode) {
    answerPanel.style.display = "none";
    answerPanel.innerHTML = "";
  }
});

// =========================
// CLICK HANDLER
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
// BUTTON SEARCH
// =========================

window.fillSearch = function(text) {
  searchBox.value = text;
  searchBox.dispatchEvent(new Event("input"));
};
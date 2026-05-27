let rules = [];

const searchBox = document.getElementById("searchBox");
const resultsDiv = document.getElementById("results");
const responseText = document.getElementById("responseText");

// Safety check
if (!searchBox || !resultsDiv) {
  console.error("Missing HTML elements");
}

// LOAD DECODE RULES (FIXED FILE NAME)
fetch("decoderules.json")
  .then(res => {
    if (!res.ok) throw new Error("Could not load decoderules.json");
    return res.json();
  })
  .then(data => {
    rules = data;
    console.log("Loaded decode rules:", rules.length);
  })
  .catch(err => {
    console.error("ERROR LOADING JSON:", err);
    if (responseText) {
      responseText.innerHTML = "❌ Failed to load Decode rules file.";
    }
  });

// Escape regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Highlight function
function highlightText(text, query) {
  if (!text) return "";

  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  return text.replace(regex, `<mark>$1</mark>`);
}

// SEARCH
searchBox.addEventListener("input", function () {

  const query = this.value.trim();

  resultsDiv.innerHTML = "";

  if (!query) return;
  if (!rules.length) return;

  const lowerQuery = query.toLowerCase();

const words = query.toLowerCase().split(" ");

const scored = rules.map(r => {

  const text =
    `${r.id || ""} ${r.title || ""} ${r.text || ""}`
      .toLowerCase();

  let score = 0;

  words.forEach(word => {

    if (word.length < 2) return;

    // exact matches get more points
    if (text.includes(word)) score += 1;

    // title matches are more important
    if ((r.title || "").toLowerCase().includes(word)) score += 3;

    // ID matches are highest priority
    if ((r.id || "").toLowerCase().includes(word)) score += 5;
  });

  return { rule: r, score };
});

const matches = scored
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .map(item => item.rule);

  // Header text
  if (responseText) {
    responseText.innerHTML = `
      The Search Shark found <b>${matches.length}</b> result(s) for "<b>${query}</b>"
    `;
  }

  // No results
  if (matches.length === 0) {
    resultsDiv.innerHTML = `
      <div class="no-results">
        No matching FTC rules found for "<b>${query}</b>"
      </div>
    `;
    return;
  }

  // Results
  matches.forEach(r => {

    const title = r.displayTitle || `${r.id} ${r.title}`;

    resultsDiv.innerHTML += `
      <div class="result">
        <h3>${highlightText(title, query)}</h3>
        <p>${highlightText(r.text, query)}</p>
      </div>
    `;
  });

});

// BUTTON SEARCH
function fillSearch(text) {
  searchBox.value = text;
  searchBox.dispatchEvent(new Event("input"));
}
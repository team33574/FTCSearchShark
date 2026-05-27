const header = document.createElement("header");
header.className = "topbar";

header.innerHTML = `
  <a href="index.html" class="logo-link">
    <div class="logo-circle">
      <img src="SearchSharkLogo.png" class="logo" alt="Logo">
    </div>
  </a>

  <nav class="nav">
    <a href="decode.html">Decode Rule Search</a>
    <a href="biobuzz.html">BioBuzz Rule Search</a>
  </nav>
`;

document.addEventListener("DOMContentLoaded", () => {
  document.body.prepend(header);
});
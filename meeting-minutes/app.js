document.addEventListener("DOMContentLoaded", () => {
  const titleInput = document.getElementById("meeting-title");
  const dateInput = document.getElementById("meeting-date");
  const searchInput = document.getElementById("participant-search");
  const addCustomBtn = document.getElementById("add-custom-btn");
  const dropdown = document.getElementById("participant-dropdown");
  const chipsContainer = document.getElementById("participant-chips");
  const transcription = document.getElementById("transcription");
  const generateBtn = document.getElementById("generate-btn");
  const copyPromptBtn = document.getElementById("copy-prompt-btn");
  const loadingEl = document.getElementById("loading");
  const resultSection = document.getElementById("result-section");
  const resultContent = document.getElementById("result-content");
  const copyResultBtn = document.getElementById("copy-result-btn");
  const shareBtn = document.getElementById("share-btn");
  const toast = document.getElementById("toast");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const apiKeyInput = document.getElementById("api-key-input");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings-btn");
  const apiBanner = document.getElementById("api-banner");
  const bannerSetupBtn = document.getElementById("banner-setup-btn");

  let selectedParticipants = [];
  let rawResultText = "";

  // Date default
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;

  // --- API Key & Model Management ---
  const API_KEY_STORE = "mm_api_key";
  const MODEL_STORE = "mm_model";
  const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

  function getApiKey() {
    return localStorage.getItem(API_KEY_STORE) || "";
  }
  function setApiKey(key) {
    if (key) {
      localStorage.setItem(API_KEY_STORE, key);
    } else {
      localStorage.removeItem(API_KEY_STORE);
    }
    updateApiBanner();
  }
  function getModel() {
    return localStorage.getItem(MODEL_STORE) || DEFAULT_MODEL;
  }
  function setModel(model) {
    localStorage.setItem(MODEL_STORE, model);
  }
  function updateApiBanner() {
    const hasKey = !!getApiKey();
    apiBanner.classList.toggle("hidden", hasKey);
    generateBtn.textContent = hasKey ? "議事録を生成" : "議事録を生成（APIキー未設定）";
    generateBtn.disabled = !hasKey;
  }
  updateApiBanner();

  // Settings modal
  function syncModelRadio() {
    const current = getModel();
    const radio = settingsModal.querySelector(`input[name="model"][value="${current}"]`);
    if (radio) radio.checked = true;
    else document.getElementById("model-haiku").checked = true;
  }

  settingsBtn.addEventListener("click", () => {
    apiKeyInput.value = getApiKey();
    syncModelRadio();
    settingsModal.classList.remove("hidden");
  });
  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });
  settingsModal.querySelector(".modal-backdrop").addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });
  saveSettingsBtn.addEventListener("click", () => {
    setApiKey(apiKeyInput.value.trim());
    const selectedModel = settingsModal.querySelector('input[name="model"]:checked');
    if (selectedModel) setModel(selectedModel.value);
    settingsModal.classList.add("hidden");
    showToast("設定を保存しました");
  });
  bannerSetupBtn.addEventListener("click", () => {
    apiKeyInput.value = getApiKey();
    settingsModal.classList.remove("hidden");
  });

  // --- Participant Management ---
  const RECENT_KEY = "mm_recent_participants";
  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch { return []; }
  }
  function saveRecent() {
    const recent = [...new Set([...selectedParticipants, ...loadRecent()])].slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }

  function renderChips() {
    chipsContainer.innerHTML = "";
    selectedParticipants.forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = name;
      const btn = document.createElement("button");
      btn.className = "chip-remove";
      btn.textContent = "\u00d7";
      btn.addEventListener("click", () => {
        selectedParticipants = selectedParticipants.filter((n) => n !== name);
        renderChips();
      });
      chip.appendChild(btn);
      chipsContainer.appendChild(chip);
    });
  }

  function showDropdown(query) {
    const q = query.toLowerCase();
    const recent = loadRecent();
    let filtered;
    if (q === "") {
      const recentSet = new Set(recent);
      const recentItems = recent.filter((n) => !selectedParticipants.includes(n));
      const others = SF_USERS.filter((n) => !selectedParticipants.includes(n) && !recentSet.has(n));
      filtered = [...recentItems, ...others];
    } else {
      filtered = SF_USERS.filter(
        (name) => !selectedParticipants.includes(name) && name.toLowerCase().includes(q)
      );
    }
    if (filtered.length === 0) {
      dropdown.classList.add("hidden");
      return;
    }
    dropdown.innerHTML = "";
    filtered.slice(0, 10).forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      li.addEventListener("click", () => {
        addParticipant(name);
        searchInput.value = "";
        dropdown.classList.add("hidden");
      });
      dropdown.appendChild(li);
    });
    dropdown.classList.remove("hidden");
  }

  function addParticipant(name) {
    const trimmed = name.trim();
    if (trimmed && !selectedParticipants.includes(trimmed)) {
      selectedParticipants.push(trimmed);
      renderChips();
    }
  }

  searchInput.addEventListener("focus", () => showDropdown(searchInput.value));
  searchInput.addEventListener("input", () => showDropdown(searchInput.value));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".form-group")) dropdown.classList.add("hidden");
  });
  addCustomBtn.addEventListener("click", () => {
    const val = searchInput.value.trim();
    if (val) { addParticipant(val); searchInput.value = ""; dropdown.classList.add("hidden"); }
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = searchInput.value.trim();
      if (val) { addParticipant(val); searchInput.value = ""; dropdown.classList.add("hidden"); }
    }
  });

  // --- Prompt Builder ---
  function buildPrompt() {
    const title = titleInput.value.trim() || "\u4f1a\u8b70";
    const date = dateInput.value || `${yyyy}-${mm}-${dd}`;
    const participants = selectedParticipants.length > 0
      ? selectedParticipants.join("\u3001") : "\u672a\u5165\u529b";
    const text = transcription.value.trim();
    const participantList = selectedParticipants.length > 0
      ? selectedParticipants.map((p) => "- " + p).join("\n") : "- \u672a\u5165\u529b";

    return `\u3042\u306a\u305f\u306f\u8b70\u4e8b\u9332\u4f5c\u6210\u306e\u5c02\u9580\u5bb6\u3067\u3059\u3002\u4ee5\u4e0b\u306e\u4f1a\u8b70\u60c5\u5831\u3068\u6587\u5b57\u8d77\u3053\u3057\u30c6\u30ad\u30b9\u30c8\u304b\u3089\u3001\u69cb\u9020\u5316\u3055\u308c\u305f\u8b70\u4e8b\u9332\u3092\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044\u3002

## \u4f1a\u8b70\u60c5\u5831
- **\u30bf\u30a4\u30c8\u30eb**: ${title}
- **\u65e5\u4ed8**: ${date}
- **\u53c2\u52a0\u8005**: ${participants}

## \u51fa\u529b\u30d5\u30a9\u30fc\u30de\u30c3\u30c8

\u4ee5\u4e0b\u306e\u30de\u30fc\u30af\u30c0\u30a6\u30f3\u5f62\u5f0f\u306b\u53b3\u5bc6\u306b\u5f93\u3063\u3066\u8b70\u4e8b\u9332\u3092\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044\u3002

---

# ${title} \u8b70\u4e8b\u9332

## 1. \u4f1a\u8b70\u6982\u8981
- **\u65e5\u6642**: ${date}
- **\u76ee\u7684**: [\u6587\u5b57\u8d77\u3053\u3057\u304b\u3089\u63a8\u5b9a\u3055\u308c\u308b\u4f1a\u8b70\u306e\u76ee\u7684\u30921\u301c2\u6587\u3067\u8a18\u8f09]

## 2. \u51fa\u5e2d\u8005
${participantList}

## 3. \u8b70\u4e8b\u5185\u5bb9

### 3-1. [\u8b70\u984c1\u306e\u30bf\u30a4\u30c8\u30eb]
[\u8b70\u8ad6\u306e\u6982\u8981\u3092\u7c21\u6f54\u306b\u307e\u3068\u3081\u308b]

\u25a0 [\u30b5\u30d6\u30c8\u30d4\u30c3\u30af1]
[\u8a73\u7d30\u5185\u5bb9]

### 3-2. [\u8b70\u984c2\u306e\u30bf\u30a4\u30c8\u30eb]
[\u8b70\u8ad6\u306e\u6982\u8981]

\uff08\u8b70\u984c\u306e\u6570\u306f\u6587\u5b57\u8d77\u3053\u3057\u306e\u5185\u5bb9\u306b\u5fdc\u3058\u3066\u9069\u5b9c\u5897\u6e1b\uff09

## 4. \u6c7a\u5b9a\u4e8b\u9805
- [\u6c7a\u5b9a\u4e8b\u98051]
- [\u6c7a\u5b9a\u4e8b\u98052]

## 5. \u30a2\u30af\u30b7\u30e7\u30f3\u30a2\u30a4\u30c6\u30e0
| \u62c5\u5f53\u8005 | \u30bf\u30b9\u30af | \u671f\u9650 |
|--------|--------|------|
| [\u540d\u524d] | [\u30bf\u30b9\u30af\u5185\u5bb9] | [\u671f\u9650] |

## 6. \u6b21\u56de\u4e88\u5b9a
[\u6b21\u56de\u4f1a\u8b70\u306b\u95a2\u3059\u308b\u60c5\u5831\u304c\u3042\u308c\u3070\u8a18\u8f09\u3002\u306a\u3051\u308c\u3070\u300c\u672a\u5b9a\u300d]

---

## \u6ce8\u610f\u4e8b\u9805
- \u6587\u5b57\u8d77\u3053\u3057\u306e\u8aa4\u8a8d\u8b58\u3068\u601d\u308f\u308c\u308b\u90e8\u5206\u306f\u6587\u8108\u304b\u3089\u9069\u5207\u306b\u88dc\u6b63\u3057\u3066\u304f\u3060\u3055\u3044
- \u91cd\u8981\u306a\u30dd\u30a4\u30f3\u30c8\u306f **\u592a\u5b57** \u3067\u5f37\u8abf\u3057\u3066\u304f\u3060\u3055\u3044
- \u8ab0\u304c\u4f55\u3092\u767a\u8a00\u3057\u305f\u304b\u307e\u3067\u306f\u6587\u5b57\u8d77\u3053\u3057\u3067\u306f\u5224\u5225\u3067\u304d\u306a\u3044\u305f\u3081\u3001\u767a\u8a00\u8005\u306e\u7279\u5b9a\u306f\u4e0d\u8981\u3067\u3059\u3002\u5185\u5bb9\u30d9\u30fc\u30b9\u3067\u6574\u7406\u3057\u3066\u304f\u3060\u3055\u3044
- \u30a2\u30af\u30b7\u30e7\u30f3\u30a2\u30a4\u30c6\u30e0\u306f\u5fc5\u305a\u62bd\u51fa\u3057\u3066\u304f\u3060\u3055\u3044\uff08\u62c5\u5f53\u8005\u304c\u4e0d\u660e\u306a\u5834\u5408\u306f\u300c\u672a\u5b9a\u300d\uff09
- \u30de\u30fc\u30af\u30c0\u30a6\u30f3\u5f62\u5f0f\u3092\u53b3\u5b88\u3057\u3066\u304f\u3060\u3055\u3044

## \u6587\u5b57\u8d77\u3053\u3057\u30c6\u30ad\u30b9\u30c8

\u4ee5\u4e0b\u306e\u30c6\u30ad\u30b9\u30c8\u3092\u57fa\u306b\u4e0a\u8a18\u30d5\u30a9\u30fc\u30de\u30c3\u30c8\u3067\u8b70\u4e8b\u9332\u3092\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044:

\`\`\`
${text}
\`\`\``;
  }

  // --- Claude API Call ---
  async function callClaudeAPI(prompt) {
    const apiKey = getApiKey();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error: ${res.status}`);
    }
    const data = await res.json();
    return data.content[0].text;
  }

  // --- Markdown to HTML ---
  function markdownToHtml(md) {
    let html = md
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^---$/gm, "<hr>")
      .replace(/^\u25a0 (.+)$/gm, '<div style="font-weight:600;margin-top:12px;">\u25a0 $1</div>');

    // Table parsing
    html = html.replace(/(\|.+\|\n)+/g, (tableBlock) => {
      const rows = tableBlock.trim().split("\n");
      if (rows.length < 2) return tableBlock;
      let table = "<table>";
      rows.forEach((row, i) => {
        if (row.match(/^\|[\s-:|]+\|$/)) return; // separator row
        const cells = row.split("|").filter((c, j, a) => j > 0 && j < a.length - 1);
        const tag = i === 0 ? "th" : "td";
        table += "<tr>" + cells.map((c) => `<${tag}>${c.trim()}</${tag}>`).join("") + "</tr>";
      });
      table += "</table>";
      return table;
    });

    // Lists
    html = html.replace(/(^- .+$\n?)+/gm, (block) => {
      const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^- /, "")}</li>`);
      return "<ul>" + items.join("") + "</ul>";
    });

    // Paragraphs
    html = html.split("\n\n").map((block) => {
      block = block.trim();
      if (!block) return "";
      if (block.startsWith("<")) return block;
      return "<p>" + block.replace(/\n/g, "<br>") + "</p>";
    }).join("\n");

    return html;
  }

  // --- Toast ---
  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 300);
    }, 2500);
  }

  // --- Clipboard ---
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    }
  }

  // --- Generate Button (API) ---
  generateBtn.addEventListener("click", async () => {
    if (!transcription.value.trim()) {
      showToast("\u6587\u5b57\u8d77\u3053\u3057\u30c6\u30ad\u30b9\u30c8\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044");
      transcription.focus();
      return;
    }
    if (!getApiKey()) {
      showToast("API\u30ad\u30fc\u3092\u8a2d\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044");
      settingsModal.classList.remove("hidden");
      return;
    }

    const prompt = buildPrompt();
    generateBtn.disabled = true;
    loadingEl.classList.remove("hidden");
    resultSection.classList.add("hidden");

    try {
      const result = await callClaudeAPI(prompt);
      rawResultText = result;
      resultContent.innerHTML = markdownToHtml(result);
      resultSection.classList.remove("hidden");
      saveRecent();
      resultSection.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      showToast("Error: " + err.message);
    } finally {
      generateBtn.disabled = false;
      loadingEl.classList.add("hidden");
    }
  });

  // --- Copy Prompt Button (Fallback) ---
  copyPromptBtn.addEventListener("click", async () => {
    if (!transcription.value.trim()) {
      showToast("\u6587\u5b57\u8d77\u3053\u3057\u30c6\u30ad\u30b9\u30c8\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044");
      transcription.focus();
      return;
    }
    const prompt = buildPrompt();
    const ok = await copyToClipboard(prompt);
    if (ok) {
      saveRecent();
      showToast("\u30d7\u30ed\u30f3\u30d7\u30c8\u3092\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f");
    } else {
      showToast("\u30b3\u30d4\u30fc\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
    }
  });

  // --- Copy Result ---
  copyResultBtn.addEventListener("click", async () => {
    if (rawResultText) {
      const ok = await copyToClipboard(rawResultText);
      showToast(ok ? "\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f" : "\u30b3\u30d4\u30fc\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
    }
  });

  // --- Share ---
  if (navigator.share) {
    shareBtn.addEventListener("click", async () => {
      if (rawResultText) {
        try {
          await navigator.share({ title: titleInput.value || "\u8b70\u4e8b\u9332", text: rawResultText });
        } catch { /* user cancelled */ }
      }
    });
  } else {
    shareBtn.classList.add("hidden");
  }
});

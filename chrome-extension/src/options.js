(function initOptionsPage() {
  const shared = window.LinkedInAIShared;
  const ids = [
    "providerType",
    "openaiApiKey",
    "openaiBaseUrl",
    "openaiModel",
    "compatibleBaseUrl",
    "compatibleApiKey",
    "compatibleModel",
    "ollamaBaseUrl",
    "ollamaModel",
    "profileContext",
    "styleGuide",
    "defaultOutputCount",
    "browserTakeoverEnabled",
    "autoSendEnabled",
    "automationBatchSize",
    "automationDelayMs"
  ];

  const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const statusMessage = document.getElementById("statusMessage");
  const saveButton = document.getElementById("saveSettings");
  const resetButton = document.getElementById("resetDefaults");
  const testButton = document.getElementById("testProvider");

  document.getElementById("providerType").addEventListener("change", refreshProviderPanels);
  saveButton.addEventListener("click", saveSettings);
  resetButton.addEventListener("click", resetDefaults);
  testButton.addEventListener("click", testProvider);

  void loadSettings();

  async function loadSettings() {
    const stored = await chrome.storage.local.get(null);
    const settings = shared.normalizeSettings(stored);

    ids.forEach((id) => {
      if (elements[id].type === "checkbox") {
        elements[id].checked = Boolean(settings[id]);
      } else {
        elements[id].value = settings[id];
      }
    });

    refreshProviderPanels();
    statusMessage.textContent = "Loaded saved settings.";
  }

  function refreshProviderPanels() {
    const providerType = elements.providerType.value;
    document.querySelectorAll(".provider-panel").forEach((panel) => {
      panel.hidden = panel.dataset.provider !== providerType;
    });
  }

  async function saveSettings() {
    const normalized = collectSettings();
    await chrome.storage.local.set(normalized);
    statusMessage.textContent = "Saved. LinkedIn pages will use the updated settings immediately.";
  }

  async function resetDefaults() {
    const defaults = shared.normalizeSettings(shared.defaultSettings);
    await chrome.storage.local.set(defaults);
    ids.forEach((id) => {
      if (elements[id].type === "checkbox") {
        elements[id].checked = Boolean(defaults[id]);
      } else {
        elements[id].value = defaults[id];
      }
    });
    refreshProviderPanels();
    statusMessage.textContent = "Defaults restored.";
  }

  function collectSettings() {
    const nextSettings = {};
    ids.forEach((id) => {
      nextSettings[id] = elements[id].type === "checkbox" ? elements[id].checked : elements[id].value;
    });

    return shared.normalizeSettings(nextSettings);
  }

  async function testProvider() {
    const normalized = collectSettings();
    statusMessage.textContent = "Testing provider connection...";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "testProvider",
        settings: normalized
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Provider test failed.");
      }

      statusMessage.textContent = response.result;
    } catch (error) {
      statusMessage.textContent = error.message || "Provider test failed.";
    }
  }
})();

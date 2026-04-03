(function initPopup() {
  const shared = window.LinkedInAIShared;
  const providerSummary = document.getElementById("providerSummary");

  document.getElementById("openSettings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("openLinkedIn").addEventListener("click", async () => {
    await chrome.tabs.create({ url: "https://www.linkedin.com/" });
  });

  void loadProviderSummary();

  async function loadProviderSummary() {
    const settings = await chrome.storage.local.get(null);
    providerSummary.textContent = `Provider: ${shared.getProviderSummary(
      shared.normalizeSettings(settings)
    )}`;
  }
})();

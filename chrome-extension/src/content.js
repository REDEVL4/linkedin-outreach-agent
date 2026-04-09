(function initLinkedInOverlay() {
  try {
    if (window.top !== window.self) {
      return;
    }

    if (document.documentElement.dataset.linkedinAiLoaded === "true") {
      return;
    }

    document.documentElement.dataset.linkedinAiLoaded = "true";

    const fallbackScenarioTemplates = {
      recruiter_reply: {
        label: "Recruiter Reply",
        placeholder: "Paste the recruiter message or capture selected text.",
        defaultGoal: "Reply warmly, show relevant fit, and move the conversation forward.",
        lengthHint: "Keep each option under 90 words."
      },
      post_comment: {
        label: "Post Comment",
        placeholder: "Paste the LinkedIn post text or capture selected text.",
        defaultGoal: "Write a thoughtful comment that adds value quickly.",
        lengthHint: "Keep each option under 45 words."
      },
      networking_followup: {
        label: "Networking Follow-up",
        placeholder: "Paste the earlier conversation or summarize it.",
        defaultGoal: "Restart the conversation with a light, useful follow-up.",
        lengthHint: "Keep each option between 40 and 80 words."
      },
      accept_connection: {
        label: "Accept Connection",
        placeholder: "Paste context about who accepted your request and why you connected.",
        defaultGoal: "Thank them and start a low-pressure conversation.",
        lengthHint: "Keep each option under 60 words."
      },
      send_connection_request: {
        label: "Send Request",
        placeholder: "Paste who they are and what you can honestly reference from their profile or post.",
        defaultGoal: "Write a personalized connection request that is specific and respectful.",
        lengthHint: "Keep each option under 280 characters."
      },
      custom: {
        label: "Custom",
        placeholder: "Paste the message, post, or situation you want help with.",
        defaultGoal: "Draft a strong LinkedIn response in my voice.",
        lengthHint: "Use the format that best fits the task."
      }
    };

    const shared = window.LinkedInAIShared || {};
    const scenarioTemplates = shared.scenarioTemplates || fallbackScenarioTemplates;
    const normalizeSettings =
      typeof shared.normalizeSettings === "function"
        ? shared.normalizeSettings.bind(shared)
        : (value) => value || {};
    const defaultSettings =
      typeof shared.defaultSettings === "object" && shared.defaultSettings
        ? shared.defaultSettings
        : {};
    const getProviderSummary =
      typeof shared.getProviderSummary === "function"
        ? shared.getProviderSummary.bind(shared)
        : () => "Provider unavailable";

    let activeScenario = "recruiter_reply";
    let lastFocusedEditable = null;
    let isGenerating = false;
    let isAutomationRunning = false;
    let stopRequested = false;
    let pendingSendButton = null;
    let cachedSettings = normalizeSettings(defaultSettings);
    let stopFallbackTimer = null;

    const host = document.createElement("div");
    host.id = "linkedin-ai-assistant-root";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = chrome.runtime.getURL("src/content.css");
    shadow.appendChild(styleLink);

    const shell = document.createElement("div");
    shell.className = "lia-shell";
    shell.innerHTML = [
      '<div class="lia-backdrop" data-role="backdrop"></div>',
      '<section class="lia-panel" hidden>',
      '<header class="lia-header">',
      '<div class="lia-eyebrow">LinkedIn AI Agent</div>',
      '<div class="lia-title-row">',
      '<div>',
      '<h1 class="lia-title">Take over the page,<br>not just the draft.</h1>',
      '<p class="lia-subtitle">Generate text, open LinkedIn dialogs, fill composers, and optionally send if you enable auto-send.</p>',
      "</div>",
      '<button class="lia-ghost-button" data-action="settings" type="button">Settings</button>',
      "</div>",
      "</header>",
      '<div class="lia-body">',
      '<div class="lia-status" data-role="provider-status">Loading settings...</div>',
      '<div class="lia-scenarios" data-role="scenario-list"></div>',
      '<div class="lia-field">',
      '<div class="lia-field-row">',
      '<label class="lia-label" for="lia-source">Source Text</label>',
      '<button class="lia-ghost-button" data-action="capture-selection" type="button">Use Selection</button>',
      "</div>",
      '<textarea id="lia-source" class="lia-textarea" placeholder=""></textarea>',
      '<div class="lia-footer-note">Leave this blank if you want the agent to pull context from the current LinkedIn page or active conversation.</div>',
      "</div>",
      '<div class="lia-field">',
      '<div class="lia-field-row">',
      '<label class="lia-label" for="lia-goal">Goal</label>',
      '<span class="lia-help" data-role="length-hint"></span>',
      "</div>",
      '<textarea id="lia-goal" class="lia-textarea lia-textarea--compact" placeholder="What do you want this message to achieve?"></textarea>',
      "</div>",
      '<div class="lia-field">',
      '<div class="lia-field-row">',
      '<label class="lia-label" for="lia-extra">Extra Instructions</label>',
      '<span class="lia-help">Tone, constraints, targeting</span>',
      "</div>",
      '<textarea id="lia-extra" class="lia-textarea lia-textarea--compact" placeholder="Example: mention Houston, keep it warm, only if the role is ML-focused."></textarea>',
      "</div>",
      '<div class="lia-field" data-role="tone-field" hidden>',
      '<div class="lia-field-row">',
      '<label class="lia-label" for="lia-tone">Tone</label>',
      '<span class="lia-help">Recruiter reply tone</span>',
      "</div>",
      '<select id="lia-tone" class="lia-select">',
      '<option value="natural">Natural</option>',
      '<option value="warm">Warm</option>',
      '<option value="concise">Concise</option>',
      '<option value="confident">Confident</option>',
      "</select>",
      "</div>",
      '<div class="lia-field">',
      '<div class="lia-inline-grid">',
      "<div>",
      '<div class="lia-field-row">',
      '<label class="lia-label" for="lia-request-count">Request Count</label>',
      '<span class="lia-help">Default 10</span>',
      "</div>",
      '<input id="lia-request-count" class="lia-number" type="number" min="1" max="100" value="10">',
      "</div>",
      "<div>",
      '<div class="lia-field-row">',
      '<label class="lia-label" for="lia-delay">Delay (ms)</label>',
      '<span class="lia-help">Between steps</span>',
      "</div>",
      '<input id="lia-delay" class="lia-number" type="number" min="300" max="10000" step="100" value="1200">',
      "</div>",
      "</div>",
      "</div>",
      '<div class="lia-actions">',
      '<button class="lia-primary-button" data-action="generate" type="button">Generate Draft</button>',
      '<button class="lia-secondary-button" data-action="agent-fill" type="button">Agent Fill</button>',
      '<button class="lia-secondary-button" data-action="agent-send" type="button">Agent Send</button>',
      '<button class="lia-secondary-button" data-action="insert" type="button">Insert Into Focused Field</button>',
      '<button class="lia-secondary-button" data-action="copy" type="button">Copy Output</button>',
      "</div>",
      '<div class="lia-divider"></div>',
      '<div class="lia-field">',
      '<div class="lia-field-row">',
      '<label class="lia-label" for="lia-output">Output</label>',
      '<span class="lia-help">Plain text</span>',
      "</div>",
      '<textarea id="lia-output" class="lia-textarea lia-textarea--output" placeholder="Generated text will appear here."></textarea>',
      "</div>",
      '<div class="lia-footer-note">Agent Fill opens and fills the nearest relevant LinkedIn composer. Agent Send can also click send if auto-send is enabled in settings.</div>',
      "</div>",
      "</section>",
      '<div class="lia-workbar" data-role="workbar" aria-live="polite">',
      '<div class="lia-workbar-left">',
      '<span class="lia-workdot"></span>',
      '<span class="lia-worktext" data-role="worktext">Working...</span>',
      "</div>",
      '<button class="lia-stop" data-action="stop-working" type="button">Stop Working Now</button>',
      "</div>",
      '<div class="lia-reviewbar" data-role="reviewbar" aria-live="polite">',
      '<div class="lia-review-copy">',
      '<div class="lia-review-title">Review Before Sending</div>',
      '<div class="lia-review-text" data-role="reviewtext">The draft is in the composer. Send it now or modify it first.</div>',
      "</div>",
      '<div class="lia-review-actions">',
      '<button class="lia-primary-button" data-action="confirm-send" type="button">Send Now</button>',
      '<button class="lia-secondary-button" data-action="modify-first" type="button">Modify First</button>',
      "</div>",
      "</div>",
      '<button class="lia-launcher" data-action="toggle-panel" title="Open LinkedIn Reply Assistant" type="button">AI</button>'
    ].join("");
    shadow.appendChild(shell);

    const panel = shadow.querySelector(".lia-panel");
    const backdrop = shadow.querySelector("[data-role='backdrop']");
    const workbar = shadow.querySelector("[data-role='workbar']");
    const worktext = shadow.querySelector("[data-role='worktext']");
    const reviewbar = shadow.querySelector("[data-role='reviewbar']");
    const reviewtext = shadow.querySelector("[data-role='reviewtext']");
    const launcher = shadow.querySelector("[data-action='toggle-panel']");
    const settingsButton = shadow.querySelector("[data-action='settings']");
    const captureButton = shadow.querySelector("[data-action='capture-selection']");
    const generateButton = shadow.querySelector("[data-action='generate']");
    const agentFillButton = shadow.querySelector("[data-action='agent-fill']");
    const agentSendButton = shadow.querySelector("[data-action='agent-send']");
    const insertButton = shadow.querySelector("[data-action='insert']");
    const copyButton = shadow.querySelector("[data-action='copy']");
    const stopButton = shadow.querySelector("[data-action='stop-working']");
    const confirmSendButton = shadow.querySelector("[data-action='confirm-send']");
    const modifyFirstButton = shadow.querySelector("[data-action='modify-first']");
    const sourceField = shadow.querySelector("#lia-source");
    const goalField = shadow.querySelector("#lia-goal");
    const extraField = shadow.querySelector("#lia-extra");
    const toneField = shadow.querySelector("[data-role='tone-field']");
    const toneSelect = shadow.querySelector("#lia-tone");
    const requestCountField = shadow.querySelector("#lia-request-count");
    const delayField = shadow.querySelector("#lia-delay");
    const outputField = shadow.querySelector("#lia-output");
    const statusNode = shadow.querySelector("[data-role='provider-status']");
    const scenarioList = shadow.querySelector("[data-role='scenario-list']");
    const lengthHint = shadow.querySelector("[data-role='length-hint']");

    if (!panel || !backdrop || !workbar || !worktext || !reviewbar || !reviewtext || !launcher || !sourceField || !goalField || !extraField || !toneField || !toneSelect || !requestCountField || !delayField || !outputField || !statusNode || !scenarioList || !lengthHint) {
      throw new Error("Extension UI did not mount all required nodes.");
    }

    function pulseButton(button) {
      if (!button) {
        return;
      }
      button.classList.add("is-busy");
      window.setTimeout(() => button.classList.remove("is-busy"), 260);
    }

    function showWorkingPreview(message) {
      backdrop.classList.add("is-active");
      workbar.classList.add("is-visible");
      if (message) {
        worktext.textContent = message;
      }
    }

    function setWorkingState(active, message) {
      isAutomationRunning = active;
      backdrop.classList.toggle("is-active", active);
      workbar.classList.toggle("is-visible", active);
      if (message) {
        worktext.textContent = message;
      }
      if (!active && !reviewbar.classList.contains("is-visible")) {
        backdrop.classList.remove("is-active");
      }
    }

    function showReviewBar(sendButton, message) {
      pendingSendButton = sendButton || null;
      if (message) {
        reviewtext.textContent = message;
      }
      reviewbar.classList.add("is-visible");
      backdrop.classList.add("is-active");
    }

    function hideReviewBar() {
      pendingSendButton = null;
      reviewbar.classList.remove("is-visible");
      if (!isAutomationRunning) {
        backdrop.classList.remove("is-active");
      }
    }

    function clearStopFallbackTimer() {
      if (stopFallbackTimer) {
        window.clearTimeout(stopFallbackTimer);
        stopFallbackTimer = null;
      }
    }

    function resetAutomationUi(message) {
      clearStopFallbackTimer();
      stopRequested = false;
      hideReviewBar();
      setWorkingState(false, message || "Ready.");
    }

    function bindIfPresent(node, eventName, handler) {
      if (!node) {
        return;
      }
      node.addEventListener(eventName, handler);
    }

    function getSelectionText() {
      return (window.getSelection()?.toString() || "").trim();
    }

    function applyScenario(nextScenario) {
      activeScenario = nextScenario;
      const config = scenarioTemplates[nextScenario] || scenarioTemplates.custom;
      sourceField.placeholder = config.placeholder;
      toneField.hidden = nextScenario !== "recruiter_reply";
      if (nextScenario === "recruiter_reply" && !toneSelect.value) {
        toneSelect.value = "natural";
      }
      if (!goalField.value.trim() || goalField.dataset.autofilled === "true") {
        goalField.value = config.defaultGoal;
        goalField.dataset.autofilled = "true";
      }
      lengthHint.textContent = config.lengthHint;
      scenarioList.querySelectorAll(".lia-chip").forEach((node) => {
        node.classList.toggle("is-active", node.dataset.scenario === nextScenario);
      });
    }

    function renderScenarioChips() {
      scenarioList.innerHTML = "";
      Object.entries(scenarioTemplates).forEach(([key, scenario]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `lia-chip${key === activeScenario ? " is-active" : ""}`;
        button.dataset.scenario = key;
        button.textContent = scenario.label;
        button.addEventListener("click", () => {
          pulseButton(button);
          applyScenario(key);
        });
        scenarioList.appendChild(button);
      });
    }

    function togglePanel() {
      const shouldOpen = panel.hidden;
      panel.hidden = !shouldOpen;
      launcher.textContent = shouldOpen ? "X" : "AI";
      if (shouldOpen && !sourceField.value.trim()) {
        const selection = getSelectionText();
        if (selection) {
          sourceField.value = selection;
        }
      }
    }

    function isEditable(node) {
      if (!(node instanceof HTMLElement)) {
        return false;
      }
      if (node.tagName === "TEXTAREA") {
        return true;
      }
      if (node.tagName === "INPUT") {
        const type = (node.getAttribute("type") || "text").toLowerCase();
        return ["text", "search", "email", "url"].includes(type);
      }
      return node.isContentEditable;
    }

    function trackFocusedEditable(event) {
      const target = event.target;
      if (target && isEditable(target)) {
        lastFocusedEditable = target;
      }
    }

    function refreshProviderSummary(settings) {
      const sendMode = settings.autoSendEnabled ? "auto-send enabled" : "review mode";
      statusNode.textContent = `Provider: ${getProviderSummary(settings)} | Agent: ${sendMode}`;
    }

    function getStorageArea() {
      return chrome?.storage?.local || null;
    }

    function storageGetAll() {
      return new Promise((resolve, reject) => {
        const area = getStorageArea();
        if (!area?.get) {
          reject(new Error("Chrome storage is unavailable in this tab."));
          return;
        }
        try {
          area.get(null, (result) => {
            const runtimeError = chrome?.runtime?.lastError;
            if (runtimeError) {
              reject(new Error(runtimeError.message || "Chrome storage request failed."));
              return;
            }
            resolve(result || {});
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    function runtimeSendMessage(message) {
      return new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage(message, (response) => {
            const runtimeError = chrome?.runtime?.lastError;
            if (runtimeError) {
              reject(new Error(runtimeError.message || "Could not reach the extension background service."));
              return;
            }
            resolve(response);
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    function isContextInvalidationError(error) {
      const message = (error?.message || String(error || "")).toLowerCase();
      return message.includes("extension context invalidated") || message.includes("context invalidated");
    }

    async function loadSettings(options = {}) {
      const { silent = false } = options;
      try {
        const raw = await storageGetAll();
        cachedSettings = normalizeSettings(raw);
        return cachedSettings;
      } catch (error) {
        cachedSettings = normalizeSettings(cachedSettings || defaultSettings);
        const message = isContextInvalidationError(error)
          ? "The extension was reloaded. Refresh this LinkedIn tab and try again."
          : error?.message || "Could not load extension settings.";
        if (!silent) {
          statusNode.textContent = message;
        }
        return { ...cachedSettings, __settingsError: message };
      }
    }

    async function initializeSettingsView() {
      const settings = await loadSettings({ silent: true });
      requestCountField.value = String(settings.automationBatchSize || 10);
      delayField.value = String(settings.automationDelayMs || 1200);
      if (settings.__settingsError) {
        statusNode.textContent = settings.__settingsError;
      } else {
        refreshProviderSummary(settings);
      }
    }

    function getRequestedBatchCount(settings) {
      const raw = Number(requestCountField.value);
      if (!Number.isFinite(raw)) {
        return settings.automationBatchSize || 10;
      }
      return Math.min(100, Math.max(1, Math.round(raw)));
    }

    function getRequestedDelay(settings) {
      const raw = Number(delayField.value);
      if (!Number.isFinite(raw)) {
        return settings.automationDelayMs || 1200;
      }
      return Math.min(10000, Math.max(300, Math.round(raw)));
    }

    async function generateDraft(overrides = {}) {
      if (isGenerating) {
        return "";
      }

      isGenerating = true;
      statusNode.textContent = "Generating draft...";

      try {
        const payload = {
          scenario: activeScenario,
          sourceText: overrides.sourceText ?? sourceField.value,
          goal: overrides.goal ?? goalField.value,
          extraInstructions: overrides.extraInstructions ?? extraField.value,
          tone: overrides.tone ?? (activeScenario === "recruiter_reply" ? toneSelect.value : ""),
          selectedText: getSelectionText(),
          pageTitle: document.title,
          pageUrl: location.href
        };

        const response = await runtimeSendMessage({
          type: "generateReply",
          payload
        });

        if (!response?.ok) {
          throw new Error(response?.error || "Generation failed.");
        }

        outputField.value = response.result;
        statusNode.textContent = "Draft ready.";
        return response.result;
      } catch (error) {
        outputField.value = "";
        statusNode.textContent = error.message || "Could not generate a draft.";
        return "";
      } finally {
        isGenerating = false;
      }
    }

    function findVisibleButtons() {
      return Array.from(document.querySelectorAll("button, [role='button'], a.artdeco-button"))
        .filter((node) => node instanceof HTMLElement)
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0;
        });
    }

    function getButtonText(node) {
      return (node.getAttribute("aria-label") || node.textContent || "").replace(/\s+/g, " ").trim();
    }

    function findButtonByText(labels) {
      const matchers = labels.map((label) => label.toLowerCase());
      return (
        findVisibleButtons().find((button) => {
          const text = getButtonText(button).toLowerCase();
          return matchers.some((label) => text.includes(label));
        }) || null
      );
    }

    function findVisibleConnectButtons() {
      return findVisibleButtons().filter((button) => /\bconnect\b/i.test(getButtonText(button)) && !/\bmessage\b/i.test(getButtonText(button)));
    }

    function findConnectionNoteEditor() {
      return document.querySelector("textarea[name='message'], textarea#custom-message, textarea, [contenteditable='true'][role='textbox']");
    }

    function getVisibleElements(selector) {
      return Array.from(document.querySelectorAll(selector))
        .filter((node) => node instanceof HTMLElement)
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0;
        });
    }

    function getSelectionAnchorElement() {
      const selection = window.getSelection();
      const anchorNode = selection?.anchorNode || null;
      if (!anchorNode) {
        return null;
      }
      return anchorNode instanceof HTMLElement ? anchorNode : anchorNode.parentElement;
    }

    function getElementViewportDistance(node) {
      if (!(node instanceof HTMLElement)) {
        return Number.POSITIVE_INFINITY;
      }
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const viewportX = window.innerWidth / 2;
      const viewportY = Math.min(window.innerHeight / 2, 420);
      return Math.abs(centerX - viewportX) + Math.abs(centerY - viewportY);
    }

    function findVisiblePostContainers() {
      const selectors = [
        ".feed-shared-update-v2",
        ".occludable-update",
        "article[data-id]",
        "article"
      ];
      const seen = new Set();
      return selectors
        .flatMap((selector) => getVisibleElements(selector))
        .filter((node) => {
          if (seen.has(node)) {
            return false;
          }
          seen.add(node);
          return true;
        })
        .filter((node) => /comment/i.test(node.innerText || ""));
    }

    function findBestPostContainer() {
      const candidates = [];
      const seen = new Set();
      const addCandidate = (node) => {
        if (!(node instanceof HTMLElement) || seen.has(node)) {
          return;
        }
        seen.add(node);
        candidates.push(node);
      };

      const focusedRoot = lastFocusedEditable instanceof HTMLElement ? lastFocusedEditable.closest(".feed-shared-update-v2, .occludable-update, article") : null;
      addCandidate(focusedRoot);
      addCandidate(getSelectionAnchorElement()?.closest(".feed-shared-update-v2, .occludable-update, article"));
      findVisiblePostContainers().forEach(addCandidate);

      return candidates
        .filter(Boolean)
        .sort((left, right) => getElementViewportDistance(left) - getElementViewportDistance(right))[0] || null;
    }

    function findCommentButtonForPost(postContainer) {
      if (!(postContainer instanceof HTMLElement)) {
        return null;
      }
      return (
        Array.from(postContainer.querySelectorAll("button, [role='button'], a.artdeco-button"))
          .filter((node) => node instanceof HTMLElement)
          .find((button) => {
            const text = getButtonText(button).toLowerCase();
            return text.includes("comment") && !text.includes("commenting off");
          }) || null
      );
    }

    function findPostCommentEditor(postContainer) {
      const selectors = [
        ".comments-comment-box__form-container [contenteditable='true']",
        ".comments-comment-box-comment__text-editor[contenteditable='true']",
        ".editor-content[contenteditable='true']",
        ".ql-editor[contenteditable='true']",
        ".comments-comment-box [contenteditable='true'][role='textbox']",
        ".feed-shared-inline-comment-textarea",
        "textarea[placeholder*='comment' i]",
        "[contenteditable='true'][aria-label*='comment' i]"
      ];

      const scopeCandidates = [postContainer, document].filter(Boolean);
      for (const scope of scopeCandidates) {
        for (const selector of selectors) {
          const match = scope.querySelector(selector);
          if (match instanceof HTMLElement) {
            return match;
          }
        }
      }

      return null;
    }

    function findBestReplyEditor() {
      if (lastFocusedEditable && document.contains(lastFocusedEditable)) {
        return lastFocusedEditable;
      }
      return document.querySelector(".msg-form__contenteditable[contenteditable='true'], [contenteditable='true'][role='textbox'], textarea");
    }

    function findComposerRoot(node) {
      if (!(node instanceof HTMLElement)) {
        return null;
      }
      return node.closest(".msg-form, .comments-comment-box, .feed-shared-update-v2, .comments-comment-item, .comments-comment-box__form-container, form, .share-box-feed-entry, article");
    }

    function findReplySendButton(editor, labels = ["Send", "Post", "Reply"]) {
      const root = findComposerRoot(editor || findBestReplyEditor());
      const matchers = labels.map((label) => label.toLowerCase());
      if (root) {
        const scopedMatch = Array.from(root.querySelectorAll("button, [role='button'], a.artdeco-button"))
          .filter((node) => node instanceof HTMLElement)
          .find((button) => {
            const text = getButtonText(button).toLowerCase();
            return matchers.some((label) => text.includes(label));
          });
        if (scopedMatch) {
          return scopedMatch;
        }
      }
      return findButtonByText(labels);
    }

    function isButtonActionable(button) {
      return !!button && !button.disabled && button.getAttribute("aria-disabled") !== "true";
    }

    function normalizeInlineText(value) {
      return (value || "").replace(/\s+/g, " ").trim();
    }

    function fillEditable(target, text) {
      target.focus();
      lastFocusedEditable = target;
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
        descriptor?.set?.call(target, text);
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
      if (target instanceof HTMLElement && target.isContentEditable) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection?.removeAllRanges();
        selection?.addRange(range);

        target.dispatchEvent(
          new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            data: text,
            inputType: "insertText"
          })
        );

        let inserted = false;
        try {
          if (typeof document.execCommand === "function") {
            document.execCommand("delete", false);
            inserted = document.execCommand("insertText", false, text);
          }
        } catch (_error) {
          inserted = false;
        }

        if (!inserted || normalizeInlineText(target.innerText) !== normalizeInlineText(text)) {
          target.textContent = "";
          const lines = text.split(/\n+/).filter(Boolean);
          if (lines.length > 1) {
            const fragment = document.createDocumentFragment();
            lines.forEach((line, index) => {
              const paragraph = document.createElement("p");
              paragraph.textContent = line;
              fragment.appendChild(paragraph);
              if (index === lines.length - 1 && !line.trim()) {
                paragraph.appendChild(document.createElement("br"));
              }
            });
            target.replaceChildren(fragment);
          } else {
            target.textContent = text;
          }
        }

        selection?.removeAllRanges();
        const endRange = document.createRange();
        endRange.selectNodeContents(target);
        endRange.collapse(false);
        selection?.addRange(endRange);
        target.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
        target.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " " }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    function insertIntoFocusedField() {
      const text = outputField.value.trim();
      if (!text) {
        statusNode.textContent = "Generate a draft first.";
        return;
      }
      if (!lastFocusedEditable || !document.contains(lastFocusedEditable)) {
        statusNode.textContent = "Click into a LinkedIn input box first, then try insert.";
        return;
      }
      fillEditable(lastFocusedEditable, text);
      statusNode.textContent = "Inserted into the focused field.";
    }

    function buildConnectionContext(button) {
      const card = button.closest("li, .entity-result, .discover-person-card, .artdeco-card, .org-people-profile-card");
      const cardText = (card?.innerText || "").replace(/\s+/g, " ").trim();
      return sourceField.value.trim() || getSelectionText() || cardText || "";
    }

    function extractConversationOrPageContext() {
      const messageNodes = Array.from(document.querySelectorAll(".msg-s-message-list__event, .msg-s-message-group__messages, .comments-comment-item, .feed-shared-update-v2"))
        .map((node) => node.innerText.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(-8);
      if (messageNodes.length) {
        return messageNodes.join("\n");
      }
      const main = document.querySelector("main");
      return (main?.innerText || document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 4000);
    }

    function extractPostCommentContext() {
      const postContainer = findBestPostContainer();
      if (postContainer) {
        return (postContainer.innerText || "").replace(/\s+/g, " ").trim().slice(0, 3000);
      }
      return extractConversationOrPageContext();
    }

    function extractRecruiterConversationContext() {
      const threadHeader = Array.from(
        document.querySelectorAll(
          ".msg-thread__link-to-profile, .msg-thread__thread-detail-link-to-profile, .msg-conversation-card--is-active, .msg-title-bar__title"
        )
      )
        .map((node) => node.innerText.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 3)
        .join("\n");

      const threadMessages = Array.from(
        document.querySelectorAll(
          ".msg-s-message-list__event, .msg-s-message-group, .msg-s-event-listitem, .msg-thread"
        )
      )
        .map((node) => node.innerText.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(-20)
        .join("\n");

      return [threadHeader, threadMessages].filter(Boolean).join("\n\n").trim();
    }

    function limitCharacters(text, max) {
      return text.length <= max ? text : `${text.slice(0, max - 3).trim()}...`;
    }

    function pause(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function updateConnectionProgress(completed, total, phase) {
      const safeTotal = Math.max(1, total);
      const current = Math.min(safeTotal, Math.max(1, completed + 1));
      const prefix = phase || "Working...";
      setWorkingState(true, `${prefix} request ${current} of ${safeTotal} | completed ${completed}`);
    }

    async function clickElement(node) {
      node.focus?.();
      node.click();
    }

    async function runConnectionRequestAgent({ batchSize, delayMs, shouldSend }) {
      const candidates = findVisibleConnectButtons().slice(0, batchSize);
      if (candidates.length === 0) {
        return "No visible Connect buttons found on this page.";
      }

      let completed = 0;
      for (const button of candidates) {
        if (stopRequested) {
          return completed > 0 ? `Stopped after ${completed} request(s).` : "Stopped before sending any request.";
        }

        updateConnectionProgress(completed, candidates.length, "Working...");
        const draft = await generateDraft({ sourceText: buildConnectionContext(button) });
        if (!draft.trim()) {
          continue;
        }

        setWorkingState(true, `Working... opening request ${completed + 1} of ${candidates.length}`);
        await clickElement(button);
        await pause(delayMs);

        const addNoteButton = findButtonByText(["Add a note"]);
        if (addNoteButton) {
          setWorkingState(true, `Working... adding note for request ${completed + 1} of ${candidates.length}`);
          await clickElement(addNoteButton);
          await pause(delayMs);
        }

        const editor = findConnectionNoteEditor();
        if (!editor) {
          continue;
        }

        fillEditable(editor, limitCharacters(draft, 280));
        setWorkingState(true, `Working... filled request ${completed + 1} of ${candidates.length}`);
        await pause(Math.min(700, delayMs));

        if (shouldSend) {
          const sendButton = findButtonByText(["Send"]);
          if (sendButton) {
            setWorkingState(true, `Working... sending request ${completed + 1} of ${candidates.length}`);
            await clickElement(sendButton);
            completed += 1;
            setWorkingState(true, `Working... request ${completed} of ${candidates.length} sent`);
            await pause(delayMs);
            continue;
          }
        }

        completed += 1;
        setWorkingState(
          true,
          shouldSend
            ? `Working... request ${completed} of ${candidates.length} processed`
            : `Working... request ${completed} of ${candidates.length} ready for review`
        );
        if (!shouldSend) {
          break;
        }
      }

      return shouldSend
        ? `Agent processed ${completed} connection request(s) and clicked send where possible.`
        : `Agent opened and filled ${completed} connection request note(s). Review and click send manually.`;
    }

    async function runReplyAgent({ delayMs, shouldSend }) {
      if (stopRequested) {
        return "Stopped before starting the reply flow.";
      }

      setWorkingState(true, "Working... reading the page and generating a draft.");
      const context =
        sourceField.value.trim() ||
        (activeScenario === "recruiter_reply"
          ? extractRecruiterConversationContext() || extractConversationOrPageContext()
          : activeScenario === "post_comment"
            ? extractPostCommentContext()
          : extractConversationOrPageContext());
      const draft = await generateDraft({ sourceText: context });
      if (!draft.trim()) {
        return "Could not generate a draft for this page.";
      }

      const targetPost = activeScenario === "post_comment" ? findBestPostContainer() : null;
      let editor = activeScenario === "post_comment" ? findPostCommentEditor(targetPost) : findBestReplyEditor();
      if (!editor && activeScenario === "post_comment") {
        const commentButton = findCommentButtonForPost(targetPost) || findButtonByText(["Comment"]);
        if (commentButton) {
          setWorkingState(true, "Working... opening the post comment box.");
          await clickElement(commentButton);
          await pause(delayMs);
          editor = findPostCommentEditor(targetPost) || findBestReplyEditor();
        }
      }

      if (!editor) {
        const messageButton = findButtonByText(["Reply", "Message"]);
        if (messageButton) {
          await clickElement(messageButton);
          await pause(delayMs);
          editor = findBestReplyEditor();
        }
      }

      if (!editor) {
        return "I could not find a LinkedIn reply editor on this page.";
      }

      fillEditable(editor, draft);
      setWorkingState(true, shouldSend ? "Working... draft inserted, preparing to send." : "Working... draft inserted into the page.");
      await pause(Math.min(700, delayMs));

      if (shouldSend) {
        if (stopRequested) {
          return "Stopped after filling the draft. Send was not clicked.";
        }
        const sendButton =
          activeScenario === "post_comment"
            ? findReplySendButton(editor, ["Post", "Comment", "Reply"])
            : findReplySendButton(editor);
        if (activeScenario === "recruiter_reply") {
          setWorkingState(false, "Recruiter reply is ready for your review.");
          showReviewBar(
            sendButton,
            isButtonActionable(sendButton)
              ? "I read the visible conversation, drafted the reply, and filled the composer. Send it now or modify it first."
              : "I filled the draft. If LinkedIn still keeps Send disabled, choose Modify First, make a tiny edit, and then send."
          );
          if (editor instanceof HTMLElement) {
            editor.focus();
          }
          return "Recruiter reply drafted from the conversation context. Review it, then choose Send Now or Modify First.";
        }
        if (isButtonActionable(sendButton)) {
          await clickElement(sendButton);
          await pause(delayMs);
          return activeScenario === "post_comment" ? "Agent filled and posted the comment." : "Agent filled and sent the reply.";
        }
        return activeScenario === "post_comment"
          ? "Agent filled the comment, but I could not find the Post button."
          : "Agent filled the reply, but I could not find the send button.";
      }

      return activeScenario === "post_comment"
        ? "Agent filled the comment. Review it and click Post when ready."
        : "Agent filled the reply. Review it and click send when ready.";
    }

    async function runAutomation(forceSend) {
      if (isAutomationRunning) {
        setWorkingState(true, "Already working. Click Stop Working Now if you want to halt.");
        return;
      }

      try {
        const settings = await loadSettings();
        if (settings.__settingsError) {
          resetAutomationUi(settings.__settingsError);
          return;
        }

        if (!settings.browserTakeoverEnabled) {
          statusNode.textContent = "Enable browser takeover in settings first.";
          resetAutomationUi("Browser takeover is disabled.");
          return;
        }

        stopRequested = false;
        const recruiterApprovalFlow = forceSend && activeScenario === "recruiter_reply";
        const allowedSend = recruiterApprovalFlow || (forceSend && settings.autoSendEnabled);
        const batchSize = getRequestedBatchCount(settings);
        const delayMs = getRequestedDelay(settings);

        statusNode.textContent = recruiterApprovalFlow
          ? "Agent takeover running with recruiter approval..."
          : allowedSend
            ? "Agent takeover running with send enabled..."
            : "Agent takeover running in review mode...";
        setWorkingState(
          true,
          recruiterApprovalFlow
            ? "Working... preparing a recruiter reply for approval."
            : allowedSend
              ? `Working... preparing up to ${batchSize} action(s) with send enabled.`
              : `Working... preparing up to ${batchSize} action(s) in review mode.`
        );

        const result =
          activeScenario === "send_connection_request"
            ? await runConnectionRequestAgent({ batchSize, delayMs, shouldSend: allowedSend })
            : await runReplyAgent({ delayMs, shouldSend: allowedSend });

        statusNode.textContent = result;
        resetAutomationUi(result);
      } catch (error) {
        const message = isContextInvalidationError(error)
          ? "The extension was reloaded. Refresh this LinkedIn tab and try again."
          : error?.message || "Automation stopped unexpectedly.";
        statusNode.textContent = message;
        resetAutomationUi(message);
      }
    }

    async function copyOutput() {
      const text = outputField.value.trim();
      if (!text) {
        statusNode.textContent = "Nothing to copy yet.";
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        statusNode.textContent = "Copied to clipboard.";
      } catch (error) {
        statusNode.textContent = "Copy failed. You can still select the text manually.";
      }
    }

    renderScenarioChips();
    applyScenario(activeScenario);
    void initializeSettingsView();

    bindIfPresent(launcher, "click", togglePanel);
    document.addEventListener("focusin", trackFocusedEditable, true);
    bindIfPresent(settingsButton, "click", () => {
      pulseButton(settingsButton);
      void runtimeSendMessage({ type: "openOptions" }).catch((error) => {
        statusNode.textContent = isContextInvalidationError(error)
          ? "The extension was reloaded. Refresh this LinkedIn tab and try again."
          : error.message || "Could not open settings.";
      });
    });
    bindIfPresent(captureButton, "click", () => {
      pulseButton(captureButton);
      const selection = getSelectionText();
      if (selection) {
        sourceField.value = selection;
      }
    });
    bindIfPresent(generateButton, "click", () => {
      pulseButton(generateButton);
      showWorkingPreview("Working... generating a draft.");
      void generateDraft().finally(() => {
        if (!isAutomationRunning) {
          setWorkingState(false, worktext.textContent);
        }
      });
    });
    bindIfPresent(agentFillButton, "click", () => {
      pulseButton(agentFillButton);
      showWorkingPreview("Working... starting agent fill.");
      void runAutomation(false);
    });
    bindIfPresent(agentSendButton, "click", () => {
      pulseButton(agentSendButton);
      showWorkingPreview("Working... starting agent send.");
      void runAutomation(true);
    });
    bindIfPresent(insertButton, "click", () => {
      pulseButton(insertButton);
      insertIntoFocusedField();
    });
    bindIfPresent(copyButton, "click", () => {
      pulseButton(copyButton);
      void copyOutput();
    });
    bindIfPresent(stopButton, "click", () => {
      pulseButton(stopButton);
      if (!isAutomationRunning) {
        resetAutomationUi("Stopped.");
        statusNode.textContent = "Stopped.";
        return;
      }
      stopRequested = true;
      clearStopFallbackTimer();
      stopFallbackTimer = window.setTimeout(() => {
        statusNode.textContent = "Stopped.";
        resetAutomationUi("Stopped.");
      }, 2500);
      setWorkingState(true, "Stopping after the current step...");
    });
    bindIfPresent(confirmSendButton, "click", async () => {
      pulseButton(confirmSendButton);
      let sendButton = pendingSendButton;
      if (!isButtonActionable(sendButton)) {
        sendButton = findReplySendButton(findBestReplyEditor());
      }
      if (!isButtonActionable(sendButton)) {
        reviewtext.textContent = "LinkedIn still has Send disabled. Choose Modify First, make a tiny edit, and then send.";
        return;
      }
      hideReviewBar();
      showWorkingPreview("Working... sending your approved recruiter reply.");
      try {
        await clickElement(sendButton);
        await pause(500);
        resetAutomationUi("Reply sent.");
        statusNode.textContent = "Reply sent.";
      } catch (error) {
        resetAutomationUi("Could not send the reply automatically.");
        statusNode.textContent = "Could not send the reply automatically.";
      }
    });
    bindIfPresent(modifyFirstButton, "click", () => {
      pulseButton(modifyFirstButton);
      hideReviewBar();
      statusNode.textContent = "Modify the filled draft, then send it manually when ready.";
      reviewtext.textContent = "The draft is in the composer. Send it now or modify it first.";
      if (lastFocusedEditable instanceof HTMLElement && document.contains(lastFocusedEditable)) {
        lastFocusedEditable.focus();
      }
    });
  } catch (error) {
    console.error("LinkedIn AI Agent fatal startup error", error);
  }
})();

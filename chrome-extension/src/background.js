importScripts("shared.js");

const shared = globalThis.LinkedInAIShared;

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(null);
  if (Object.keys(existing).length === 0) {
    await chrome.storage.local.set(shared.defaultSettings);
    return;
  }

  await chrome.storage.local.set(shared.normalizeSettings(existing));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === "openOptions") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "generateReply") {
    handleGenerateReply(message.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

    return true;
  }

  return false;
});

async function handleGenerateReply(payload) {
  const rawSettings = await chrome.storage.local.get(null);
  const settings = shared.normalizeSettings(rawSettings);
  const prompt = shared.buildPrompt(payload || {}, settings);

  switch (settings.providerType) {
    case "openai":
      return generateWithOpenAI(settings, prompt);
    case "openai-compatible":
      return generateWithCompatibleApi(settings, prompt);
    case "ollama":
      return generateWithOllama(settings, prompt);
    default:
      throw new Error("Unsupported provider type in settings.");
  }
}

async function generateWithOpenAI(settings, prompt) {
  if (!settings.openaiApiKey.trim()) {
    throw new Error("Add your OpenAI API key in extension settings.");
  }

  if (!settings.openaiModel.trim()) {
    throw new Error("Set an OpenAI model in extension settings.");
  }

  const response = await fetch(`${settings.openaiBaseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.openaiApiKey.trim()}`
    },
    body: JSON.stringify({
      model: settings.openaiModel.trim(),
      instructions: prompt.systemPrompt,
      input: prompt.userPrompt
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(extractApiError(data) || "OpenAI request failed.");
  }

  const text = data.output_text || extractResponsesOutputText(data) || "";
  if (!text.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }

  return text.trim();
}

async function generateWithCompatibleApi(settings, prompt) {
  if (!settings.compatibleBaseUrl.trim()) {
    throw new Error("Set your OpenAI-compatible base URL in extension settings.");
  }

  if (!settings.compatibleModel.trim()) {
    throw new Error("Set your OpenAI-compatible model in extension settings.");
  }

  const headers = {
    "Content-Type": "application/json"
  };

  if (settings.compatibleApiKey.trim()) {
    headers.Authorization = `Bearer ${settings.compatibleApiKey.trim()}`;
  }

  const response = await fetch(`${settings.compatibleBaseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: settings.compatibleModel.trim(),
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: prompt.systemPrompt
        },
        {
          role: "user",
          content: prompt.userPrompt
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(extractApiError(data) || "OpenAI-compatible request failed.");
  }

  const text = data?.choices?.[0]?.message?.content || "";
  if (!text.trim()) {
    throw new Error("The OpenAI-compatible server returned an empty response.");
  }

  return text.trim();
}

async function generateWithOllama(settings, prompt) {
  if (!settings.ollamaBaseUrl.trim()) {
    throw new Error("Set your Ollama base URL in extension settings.");
  }

  if (!settings.ollamaModel.trim()) {
    throw new Error("Set your Ollama model in extension settings.");
  }

  const response = await fetch(`${settings.ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.ollamaModel.trim(),
      stream: false,
      options: {
        temperature: 0.6
      },
      messages: [
        {
          role: "system",
          content: prompt.systemPrompt
        },
        {
          role: "user",
          content: prompt.userPrompt
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(extractApiError(data) || "Ollama request failed.");
  }

  const text = data?.message?.content || "";
  if (!text.trim()) {
    throw new Error("Ollama returned an empty response.");
  }

  return text.trim();
}

function extractResponsesOutputText(data) {
  if (!Array.isArray(data?.output)) {
    return "";
  }

  const parts = [];
  for (const item of data.output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const content of item.content) {
      if (typeof content?.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function extractApiError(data) {
  if (typeof data?.error?.message === "string") {
    return data.error.message;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  return "";
}

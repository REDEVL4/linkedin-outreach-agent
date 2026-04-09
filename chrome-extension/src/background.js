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

  if (message.type === "testProvider") {
    handleTestProvider(message.settings)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

    return true;
  }

  return false;
});

async function handleGenerateReply(payload) {
  const settings = await getStoredSettings();
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

async function handleTestProvider(candidateSettings) {
  const settings = shared.normalizeSettings(candidateSettings || (await getStoredSettings()));

  switch (settings.providerType) {
    case "openai":
      await testOpenAI(settings);
      return `OpenAI connection looks good using ${settings.openaiModel.trim()}.`;
    case "openai-compatible":
      await testCompatibleProvider(settings);
      return `OpenAI-compatible connection looks good using ${settings.compatibleModel.trim()}.`;
    case "ollama": {
      const result = await testOllama(settings);
      return `Ollama is reachable at ${result.baseUrl} and model ${result.model} is available.`;
    }
    default:
      throw new Error("Unsupported provider type in settings.");
  }
}

async function getStoredSettings() {
  const rawSettings = await chrome.storage.local.get(null);
  return shared.normalizeSettings(rawSettings);
}

async function generateWithOpenAI(settings, prompt) {
  if (!settings.openaiApiKey.trim()) {
    throw new Error("Add your OpenAI API key in extension settings.");
  }

  if (!settings.openaiModel.trim()) {
    throw new Error("Set an OpenAI model in extension settings.");
  }

  const data = await requestJson(`${settings.openaiBaseUrl}/responses`, {
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
  }, "OpenAI request failed.");

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

  const data = await requestJson(`${settings.compatibleBaseUrl}/chat/completions`, {
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
  }, "OpenAI-compatible request failed.");

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

  const ollama = await testOllama(settings);

  try {
    const data = await requestJson(`${ollama.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: ollama.model,
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
    }, "Ollama request failed.");

    const text = data?.message?.content || "";
    if (text.trim()) {
      return text.trim();
    }
  } catch (error) {
    const fallbackText = await generateWithOllamaFallback(ollama, prompt, error);
    if (fallbackText.trim()) {
      return fallbackText.trim();
    }
    throw error;
  }

  return generateWithOllamaFallback(ollama, prompt);
}

async function generateWithOllamaFallback(ollama, prompt, originalError) {
  const data = await requestJson(`${ollama.baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: ollama.model,
      prompt: buildOllamaPrompt(prompt),
      stream: false,
      options: {
        temperature: 0.6
      }
    })
  }, originalError?.message || "Ollama request failed.");

  const text = data?.response || data?.message?.content || "";
  if (!text.trim()) {
    throw new Error("Ollama returned an empty response.");
  }

  return text.trim();
}

async function testOpenAI(settings) {
  if (!settings.openaiApiKey.trim()) {
    throw new Error("Add your OpenAI API key in extension settings.");
  }

  await requestJson(`${settings.openaiBaseUrl}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${settings.openaiApiKey.trim()}`
    }
  }, "Could not reach OpenAI.");
}

async function testCompatibleProvider(settings) {
  if (!settings.compatibleBaseUrl.trim()) {
    throw new Error("Set your OpenAI-compatible base URL in extension settings.");
  }

  if (!settings.compatibleModel.trim()) {
    throw new Error("Set your OpenAI-compatible model in extension settings.");
  }

  const headers = {};
  if (settings.compatibleApiKey.trim()) {
    headers.Authorization = `Bearer ${settings.compatibleApiKey.trim()}`;
  }

  await requestJson(`${settings.compatibleBaseUrl}/models`, {
    method: "GET",
    headers
  }, "Could not reach the OpenAI-compatible server.");
}

async function testOllama(settings) {
  const model = settings.ollamaModel.trim();
  const errors = [];

  for (const baseUrl of buildLocalBaseUrlCandidates(settings.ollamaBaseUrl.trim())) {
    try {
      const data = await requestJson(`${baseUrl}/api/tags`, {
        method: "GET"
      }, `Could not reach Ollama at ${baseUrl}.`);
      const models = Array.isArray(data?.models) ? data.models.map((entry) => entry?.name).filter(Boolean) : [];
      if (models.length && !models.includes(model)) {
        throw new Error(`Ollama is running at ${baseUrl}, but model "${model}" is not installed. Run "ollama pull ${model}".`);
      }
      return { baseUrl, model, models };
    } catch (error) {
      errors.push(error.message || String(error));
    }
  }

  throw new Error(
    errors[errors.length - 1] ||
      `Could not reach Ollama. Make sure the Ollama app is running and listening on ${settings.ollamaBaseUrl.trim()}.`
  );
}

function buildLocalBaseUrlCandidates(baseUrl) {
  const source = (baseUrl || "").trim().replace(/\/+$/, "");
  const candidates = [source];
  if (source.includes("127.0.0.1")) {
    candidates.push(source.replace("127.0.0.1", "localhost"));
  } else if (source.includes("localhost")) {
    candidates.push(source.replace("localhost", "127.0.0.1"));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function buildOllamaPrompt(prompt) {
  return [prompt.systemPrompt, "", prompt.userPrompt].filter(Boolean).join("\n");
}

async function requestJson(url, init, fallbackMessage) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(fallbackMessage || error.message || `Request failed for ${url}.`);
  }

  const rawText = await response.text();
  const data = safeJsonParse(rawText);
  if (!response.ok) {
    throw new Error(extractApiError(data) || rawText || fallbackMessage || `Request failed with status ${response.status}.`);
  }

  return data;
}

function safeJsonParse(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return { message: value };
  }
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

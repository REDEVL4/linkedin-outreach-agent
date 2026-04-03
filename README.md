# LinkedIn Outreach Agent

I built this project to make LinkedIn outreach feel more natural, more personalized, and much less repetitive.

The idea started as a Codex plugin for drafting replies based on my own background, writing style, and career goals. From there, I turned it into a Chrome extension that can work directly on LinkedIn pages, read the visible context, generate a response in my voice, and help me handle things like recruiter replies, networking follow-ups, post comments, and connection requests.

What I wanted was not a generic AI writer that sounds polished but fake. I wanted something that stays grounded in my real profile, sounds like me, and helps me move faster without losing control over the final message.

## What this project includes

This repository has two related pieces:

- A Codex plugin that stores my profile context, tone guidance, and reusable prompt structure for LinkedIn drafting.
- A Chrome extension that runs on LinkedIn and lets me generate, fill, review, and sometimes send replies directly from the page.

## Main features

- Uses my saved profile context and style guide so replies stay aligned with my real background.
- Supports recruiter replies, post comments, networking follow-ups, connection acceptance replies, and connection requests.
- Can read visible LinkedIn page context or message-thread context before drafting.
- Supports OpenAI, Ollama, and OpenAI-compatible local model servers.
- Includes a browser-agent mode that can open dialogs, fill fields, and help with repetitive LinkedIn actions.
- Adds a review-first flow for recruiter replies so I can approve or edit the message before it is sent.

## Why I built it this way

I wanted something practical for real outreach, not just a demo.

When I’m replying to recruiters or sending networking messages, the hard part is usually not writing English. The hard part is staying specific, staying honest, and keeping the tone natural. A lot of AI-generated outreach sounds too polished, too eager, or too generic. This project is meant to help with that by grounding every draft in actual profile information and a simple voice guide.

I also wanted flexibility in model choice. Some days I may want to use OpenAI. Other times I may want to keep everything local with Ollama or another OpenAI-compatible server.

## Repository structure

`chrome-extension/`

- The main Chrome extension code
- Includes the LinkedIn overlay, settings page, popup, shared prompt logic, and background service worker

`plugins/linkedin-reply-assistant/`

- The original Codex plugin version
- Includes knowledge files like my profile context and style guide

`.agents/plugins/marketplace.json`

- Local Codex marketplace registration for the plugin

## How the Chrome extension works

The extension injects a floating assistant into LinkedIn pages. From there I can:

1. Choose a scenario like recruiter reply or send request
2. Either provide source text or let the agent use visible page context
3. Generate a draft with my selected model provider
4. Fill the LinkedIn composer directly
5. Review the message before sending when needed

For recruiter replies, the extension is designed to read the visible conversation first, understand the context, and generate a single reply that sounds like a real response rather than a list of AI variations.

## Model providers

The extension supports three provider modes:

### 1. Ollama

This is the default local setup.

- Base URL: `http://127.0.0.1:11434`
- Current default model: `gemma3:12b`

If the model is not available yet:

```powershell
ollama pull gemma3:12b
```

### 2. OpenAI

Use the OpenAI API if I want cloud-based generation.

- Base URL: `https://api.openai.com/v1`
- Model can be configured in extension settings

### 3. OpenAI-compatible local servers

This works for tools like LM Studio or other servers that expose an OpenAI-style API.

- Common local URL: `http://127.0.0.1:1234/v1`

## Installing the Chrome extension

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click `Load unpacked`
4. Select the `chrome-extension` folder
5. Open the extension settings and choose the provider you want
6. Save settings and open a fresh LinkedIn tab

## Installing the Codex plugin

The Codex plugin files are included in this repo under `plugins/linkedin-reply-assistant`.

That version is useful if I want the profile-grounded drafting workflow directly inside Codex, separate from the Chrome extension.

## Key files

- `chrome-extension/manifest.json`
- `chrome-extension/src/content.js`
- `chrome-extension/src/background.js`
- `chrome-extension/src/shared.js`
- `plugins/linkedin-reply-assistant/.codex-plugin/plugin.json`
- `plugins/linkedin-reply-assistant/knowledge/profile.md`
- `plugins/linkedin-reply-assistant/knowledge/style-guide.md`

## Responsible use

This project can help with drafting and browser automation, but I still treat it as an assistant, not a replacement for judgment.

That matters especially on LinkedIn. Messages should stay truthful, respectful, and relevant to the person I’m contacting. I do not want the tool inventing experience, over-claiming skills, or sending careless bulk outreach.

## Current limitations

- LinkedIn changes its DOM often, so selectors may need updates over time.
- Local model performance depends on whether Ollama or another server is running correctly.
- Fully autonomous browser actions should be used carefully and reviewed before scaling them up.
- This project does not use a logged-in ChatGPT web session directly.

## Future improvements

- Better selector coverage across more LinkedIn page types
- A cleaner connection-request queue with stronger progress tracking
- Built-in provider health checks from the extension UI
- Stronger recruiter intent presets like interested, need more details, and polite decline
- A local proxy option for safer API-key handling

## Personal note

For me, the most important part of this project is not automation by itself. It is making sure the output still feels human.

If a reply sounds like something I would never actually say, then the tool is not doing its job. The goal here is to reduce friction while keeping the message natural, specific, and honest.

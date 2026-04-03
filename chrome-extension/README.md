# LinkedIn Reply Assistant Chrome Extension

This is a Chrome extension version of your LinkedIn assistant. It runs on `linkedin.com`, lets you choose a response mode, and can call either:

- OpenAI API
- A local Ollama instance
- Any OpenAI-compatible local endpoint such as LM Studio or a local proxy

## Important note about ChatGPT

This extension does **not** use your consumer ChatGPT website session directly. Instead, use:

- an OpenAI API key if you want OpenAI models
- a local endpoint if you want your own local LLM

That is much more reliable than trying to automate `chatgpt.com` in the background.

## Load in Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this folder:

`C:\Users\reddy\Downloads\LinkedInPlugin\chrome-extension`

## Configure

1. Open the extension popup
2. Click **Open Settings**
3. Choose a provider:
   - `openai`
   - `ollama`
   - `openai-compatible`
4. Enter model and endpoint details
5. Save settings
6. In the Browser Agent section, choose whether the extension only fills drafts or is allowed to click final send

## Recommended local setups

### Ollama

- Base URL: `http://127.0.0.1:11434`
- Model: default is now `gemma3:12b`
- If you do not have it yet, run `ollama pull gemma3:12b`
- If Ollama is not responding on `127.0.0.1:11434`, start the Ollama app first and then retry

### LM Studio or local OpenAI-compatible server

- Base URL: usually `http://127.0.0.1:1234/v1`
- Model: whatever your server exposes

## OpenAI setup

- Base URL: `https://api.openai.com/v1`
- Add your API key in the settings page
- Choose your model

For personal use on your own machine, the extension stores settings locally in Chrome storage. Do not distribute this extension with your API key embedded.

## How to use on LinkedIn

1. Visit any LinkedIn page
2. Click the floating **AI** button
3. Pick a mode:
   - Recruiter reply
   - Post comment
   - Follow-up
   - Accept connection
   - Send request
   - Custom
4. Paste or capture text from the page, or leave it blank and let the agent read the current page context
5. Use one of these actions:
   - `Generate Draft`
   - `Agent Fill`
   - `Agent Send`
6. `Agent Fill` opens the nearest relevant LinkedIn composer and inserts the generated text
7. `Agent Send` also clicks send, but only if auto-send is enabled in settings

(function initShared(global) {
  const profileContext = `# My LinkedIn Profile Context

## Identity
- Name: Govardhan Reddy Narala
- Role / title: Data Scientist | Applied ML, NLP, Deep Learning
- Location: Greater Houston, Texas
- Years of experience: About 3 years in data and software systems, plus 2.5 years of pre-master's engineering experience at TCS and Hexagon

## What I Do
- Main expertise: Applied machine learning, NLP, deep learning, data engineering, ETL/ELT, SQL, PyTorch, Spark
- Industries I work in: Healthcare and medical imaging research, manufacturing, aviation, enterprise SaaS, data platforms
- Types of problems I solve: Turning messy or large-scale datasets into reliable models, production-ready pipelines, and decision-ready systems
- Services or offers: Data science, ML engineering, data pipeline design, model development, analytics engineering, cloud-native backend and integration support

## Target Audience
- Ideal customers, employers, or collaborators: Teams hiring for Data Scientist, Applied ML, ML Engineer, or data-platform roles
- People I want to network with: Recruiters, hiring managers, founders, engineering leaders, and researchers working in AI, data, and scalable systems

## Proof Points
- Past companies or projects: Tata Consultancy Services, Hexagon Manufacturing Intelligence, University of Houston-Clear Lake, Houston crime prediction engine, disease-gene clustering with GCNs, multimodal book-genre classification, global hunger big-data pipelines
- Results I can mention publicly:
  - Built a crime-prediction engine on 3.6M+ records using a true temporal holdout and Spark/Hive evaluation with macro AUC/ROC
  - Co-authored research on adversarial attacks and defense in medical CNNs accepted for publication and oral presentation at ICICT 2026
  - Reduced production incident triage time by 40% at Hexagon with a custom traceability layer and observability tooling
  - Supported 10+ global airline partners through Azure Data Factory and Durable Functions ingestion workflows
  - Achieved 99.9% reliability for high-traffic business flows and 99.9% data accuracy in analytics layers
  - Mentored 60+ students as a Graduate Teaching Assistant in Python, databases, and big data

## Current Goals
- What I want LinkedIn conversations to lead to: Interviews, applied ML and data science opportunities, meaningful technical conversations, and strong professional connections
- Preferred call to action: Invite the other person to share more details, continue the conversation, or schedule a quick call when relevant
- Opportunities I want more of: Data Scientist, Applied ML, ML Engineer, NLP, deep learning, and scalable data-systems roles

## Voice Notes
- 3 words that describe my tone: thoughtful, grounded, confident
- Phrases I like using: "happy to learn more", "would love to connect", "thanks for reaching out", "happy to share more context"
- Phrases I never want to use: "rockstar", "guru", "ninja", overhyped sales language, generic flattery`;

  const styleGuide = `# LinkedIn Style Guide

## Core style
- Sound human, specific, and confident.
- Keep replies easy to skim.
- Avoid hype, buzzwords, and fake enthusiasm.
- Match the energy of the other person without mirroring awkward phrasing.
- Lean slightly technical and thoughtful when the topic is engineering, ML, or data.
- Prefer clarity over cleverness.

## DM guidance
- Open with a natural acknowledgment.
- Answer the main point quickly.
- Use a soft, low-pressure CTA when one is needed.
- Do not make the reply sound salesy unless I explicitly ask for that.
- When relevant, connect my applied ML and production-systems background to the opportunity in one sentence.

## Comment guidance
- Add value in the first sentence.
- Mention a concrete point from the post.
- If useful, end with a thoughtful question.
- Do not leave generic comments like "Great post" unless I ask for minimal engagement.
- For AI or data posts, favor practical takeaways over broad inspiration.

## Preferred tone cues
- Calm confidence, not loud self-promotion
- Technical depth explained in plain English
- Helpful and curious with recruiters, peers, and hiring managers`;

  const scenarioTemplates = {
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

  const defaultSettings = {
    providerType: "ollama",
    openaiApiKey: "",
    openaiBaseUrl: "https://api.openai.com/v1",
    openaiModel: "gpt-5.4",
    compatibleBaseUrl: "http://127.0.0.1:1234/v1",
    compatibleApiKey: "",
    compatibleModel: "",
    ollamaBaseUrl: "http://127.0.0.1:11434",
    ollamaModel: "gemma3:12b",
    profileContext,
    styleGuide,
    defaultOutputCount: 3,
    browserTakeoverEnabled: true,
    autoSendEnabled: false,
    automationBatchSize: 10,
    automationDelayMs: 1200
  };

  function clampOutputCount(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 3;
    }

    return Math.min(5, Math.max(1, Math.round(numeric)));
  }

  function normalizeBaseUrl(value, fallback) {
    const source = (value || fallback || "").trim();
    return source.replace(/\/+$/, "");
  }

  function normalizeSettings(candidate) {
    const settings = Object.assign({}, defaultSettings, candidate || {});
    settings.providerType = settings.providerType || defaultSettings.providerType;
    settings.openaiBaseUrl = normalizeBaseUrl(settings.openaiBaseUrl, defaultSettings.openaiBaseUrl);
    settings.compatibleBaseUrl = normalizeBaseUrl(settings.compatibleBaseUrl, defaultSettings.compatibleBaseUrl);
    settings.ollamaBaseUrl = normalizeBaseUrl(settings.ollamaBaseUrl, defaultSettings.ollamaBaseUrl);
    if (!String(settings.ollamaModel || "").trim() || String(settings.ollamaModel).trim() === "llama3.1:8b") {
      settings.ollamaModel = defaultSettings.ollamaModel;
    }
    settings.defaultOutputCount = clampOutputCount(settings.defaultOutputCount);
    settings.automationBatchSize = Math.min(100, Math.max(1, Number(settings.automationBatchSize) || 10));
    settings.automationDelayMs = Math.min(10000, Math.max(300, Number(settings.automationDelayMs) || 1200));
    settings.browserTakeoverEnabled = Boolean(settings.browserTakeoverEnabled);
    settings.autoSendEnabled = Boolean(settings.autoSendEnabled);
    settings.profileContext = (settings.profileContext || "").trim() || defaultSettings.profileContext;
    settings.styleGuide = (settings.styleGuide || "").trim() || defaultSettings.styleGuide;
    return settings;
  }

  function buildPrompt(payload, settings) {
    const scenario = scenarioTemplates[payload.scenario] || scenarioTemplates.custom;
    const goal = (payload.goal || "").trim() || scenario.defaultGoal;
    const extra = (payload.extraInstructions || "").trim();
    const sourceText = (payload.sourceText || "").trim();
    const pageTitle = (payload.pageTitle || "").trim();
    const pageUrl = (payload.pageUrl || "").trim();
    const selection = (payload.selectedText || "").trim();
    const tone = (payload.tone || "").trim().toLowerCase();
    const singleDraft = payload.scenario === "recruiter_reply" || Boolean(tone);
    const outputCount = singleDraft ? 1 : clampOutputCount(payload.outputCount || settings.defaultOutputCount);

    const toneGuide = {
      natural: "Write like a real person replying on LinkedIn. Conversational, human, and not overly polished. Mirror the likely length and formality of the visible conversation while staying in the user's voice.",
      warm: "Write warm, friendly, and approachable while still sounding professional.",
      concise: "Write concise and efficient. Keep it crisp without sounding cold.",
      confident: "Write confident and clear, but not arrogant or salesy."
    };

    const systemPrompt = [
      "You are a LinkedIn writing assistant.",
      "Write grounded, useful LinkedIn copy using only the user's saved profile, style guide, and the content provided.",
      "Do not invent employers, results, timelines, or qualifications.",
      "Match the user's tone: thoughtful, grounded, confident.",
      singleDraft
        ? "Return exactly one draft. Do not provide multiple versions, labels, bullets, or commentary."
        : "When appropriate, provide multiple options labeled Concise, Warm, and Strong.",
      tone && toneGuide[tone] ? toneGuide[tone] : "",
      payload.scenario === "recruiter_reply"
        ? "For recruiter replies, sound natural and human, as if the user is replying personally. Use the visible conversation to infer how formal, direct, and detailed the reply should be."
        : "",
      "Do not include commentary outside the requested draft unless explicitly asked."
    ]
      .filter(Boolean)
      .join("\\n");

    const userPrompt = [
      `Scenario: ${scenario.label}`,
      `Goal: ${goal}`,
      `Desired outputs: ${outputCount}`,
      `Length guidance: ${scenario.lengthHint}`,
      tone ? `Selected tone: ${tone}` : "",
      "",
      "User profile context:",
      settings.profileContext,
      "",
      "Style guide:",
      settings.styleGuide,
      "",
      pageTitle ? `LinkedIn page title: ${pageTitle}` : "",
      pageUrl ? `LinkedIn page URL: ${pageUrl}` : "",
      selection ? `Selected text from page:\\n${selection}` : "",
      sourceText ? `Primary source text:\\n${sourceText}` : "Primary source text:\\n[none provided]",
      extra ? `Extra instructions:\\n${extra}` : "",
      "",
      "Output requirements:",
      "- Write directly usable LinkedIn copy.",
      "- Return plain text only.",
      singleDraft
        ? "- Return a single final draft only."
        : "- If multiple options are requested, separate them with clear labels.",
      "- If the scenario is send connection request, respect LinkedIn's short note constraint.",
      payload.scenario === "recruiter_reply"
        ? "- Make the recruiter reply sound natural, like the user is genuinely responding."
        : "",
      payload.scenario === "recruiter_reply" && tone === "natural"
        ? "- For Natural tone, match the conversation's apparent formality and keep the reply close to the likely expected length."
        : "",
      payload.scenario === "recruiter_reply"
        ? "- Avoid sounding templated, overly eager, or AI-written."
        : "",
      "- If details are missing, stay conservative and generic rather than inventing facts."
    ]
      .filter(Boolean)
      .join("\\n");

    return { systemPrompt, userPrompt };
  }

  function getProviderSummary(settings) {
    switch (settings.providerType) {
      case "openai":
        return `OpenAI API (${settings.openaiModel || "model not set"})`;
      case "openai-compatible":
        return `OpenAI-compatible (${settings.compatibleModel || "model not set"})`;
      case "ollama":
      default:
        return `Ollama (${settings.ollamaModel || "model not set"})`;
    }
  }

  global.LinkedInAIShared = {
    defaultSettings,
    scenarioTemplates,
    normalizeSettings,
    buildPrompt,
    getProviderSummary
  };
})(globalThis);

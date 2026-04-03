# LinkedIn Reply Assistant

This Codex plugin helps you draft LinkedIn direct-message replies and post comments using your own background, offers, proof points, and writing style.

## What it does

- Reads your saved context from `knowledge/profile.md` and `knowledge/style-guide.md`
- Drafts replies for LinkedIn DMs, comments, follow-ups, and connection-message responses
- Keeps responses grounded in facts you provide instead of inventing claims
- Offers multiple tones so you can pick the one that feels right

## What it does not do yet

This version is a drafting assistant. It does not log into LinkedIn or auto-post replies. If you want, we can add a browser automation or API-backed connector later.

## Setup

1. Fill in `knowledge/profile.md` with your experience, offers, proof points, and boundaries.
2. Adjust `knowledge/style-guide.md` so the voice matches how you actually write.
3. Use the plugin skill by asking Codex for a LinkedIn reply or comment and pasting the message or post you want to respond to.

## Example prompts

- `Use LinkedIn Reply Assistant to answer this DM in a warm but concise tone: ...`
- `Write 3 thoughtful comment options for this LinkedIn post based on my profile.`
- `Draft a follow-up to this recruiter message using my background and keep it under 70 words.`

## Optional helper script

You can also assemble a reply brief from a text file:

```powershell
python .\plugins\linkedin-reply-assistant\scripts\build_reply_brief.py `
  --mode dm `
  --target .\incoming-message.txt `
  --goal "Reply politely and suggest a call next week"
```

The script prints a structured brief that includes your saved profile and style guide.

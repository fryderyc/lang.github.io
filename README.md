# Translate Workspace

Translate Workspace is a browser-only tool for translators and reviewers. Paste an article, split it into sentences, request automated translations, and chat about each sentence—all without leaving the page.

> ⚠️ **Keep credentials secret.** The current setup loads Google Translation and OpenAI API keys directly from `config.js`, which is acceptable **only** for local/offline usage. Never deploy these keys in public-facing code. If you plan to host the app, create a secure backend proxy that stores the keys and signs requests on behalf of the browser.

## Features

- **Paste → Load → Review** – Drop source text into the Content Area and click **Load** to lock it for sentence-by-sentence navigation. Click **Unload** to edit again.
- **Sentence navigation** – Each sentence becomes a clickable button; the highlight follows the mouse or arrow keys and auto-scrolls the reading pane.
- **Dual translations** – Highlight changes call Google Translate for two configurable languages. Responses are cached per sentence/language pair so revisiting a sentence is instant.
- **Contextual chat** – Chat with OpenAI about the highlighted sentence (or get a warning if no key/sentence is available). Each message sends both the sentence and your prompt.
- **Theme picker** – Choose among Light, Dark, Ocean, Autumn, Forest, Sunset, or Slate palettes.

## Requirements

- Modern browser
- Google Cloud project with the Translation API v2 enabled
- OpenAI API access

## Project Structure

```
translate4/
├── index.html      # Layout and DOM structure
├── styles.css      # Base styles + theme definitions
├── theme.js        # Theme picker wiring
├── content.js      # Sentence parsing, translations, caching, content controls
├── chat.js         # Chat UI, markdown rendering, and OpenAI calls
├── config.js       # Local configuration (API keys, endpoints, language labels)
└── README.md
```

## Setup

1. **Clone/download** this repository.
2. **Configure APIs** by editing `config.js`:
   ```js
   window.APP_CONFIG = {
     googleApiKey: 'YOUR-GOOGLE-KEY',
     googleTranslationUrl: 'https://translation.googleapis.com/language/translate/v2',
     translationTargets: ['en', 'zh-tw'],
     translationLabels: ['English', 'Chinese'],
     openaiApiKey: 'YOUR-OPENAI-KEY',
     openaiChatUrl: 'https://api.openai.com/v1/chat/completions',
     openaiModel: 'gpt-4o-mini',
   };
   ```
   - Change the translation targets/labels to match your workflow.
   - You may also customize the OpenAI model/endpoint, but keep the key private.
3. **Serve locally** (recommended). Example:
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```
   Opening `index.html` directly via `file://` often works, but some browsers block `fetch` requests in that mode.

## Usage

1. paste + **Load** – paste an article into the textarea and click **Load**.
2. **Highlight** – click sentences or use the arrow keys; the active sentence stays centered and triggers translations.
3. **Read translations** – the two panels show the translated text (titles update with the configured language names).
4. **Chat** – enter a question; the app sends the highlighted sentence plus your prompt to OpenAI and prints the reply.
5. **Unload** to edit or paste a new article.

## Configuration Reference

| Key                    | Purpose                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `googleApiKey`         | Required for Translation API calls.                                                         |
| `googleTranslationUrl` | Overrides the Google endpoint (useful for proxies).                                        |
| `translationTargets`   | Array of ISO-639-1 codes; only the first two are used currently.                           |
| `translationLabels`    | Optional display names for the translation panels.                                         |
| `openaiApiKey`         | Required for chat functionality.                                                           |
| `openaiChatUrl`        | Chat endpoint; defaults to OpenAI’s chat completions API.                                  |
| `openaiModel`          | Model identifier (e.g., `gpt-4o-mini`).                                                    |

## Security Guidance

- **Do not ship real keys in client code.** Move the Google and OpenAI calls to a backend or proxy before deploying publicly.
- Rotate keys frequently during local experimentation.
- If you must demo publicly, use temporary keys with hard usage caps and remove them immediately afterward.

## Roadmap Ideas

- Backend proxy for secret storage, usage metering, and rate limiting.
- Sentence-level notes, approvals, or exports.
- Multi-user collaboration or history tracking.

---

Happy translating—just keep those keys private. 🚫🔑

# JD Match Analyzer

Paste a resume and a job description, get back a structured, honest fit analysis — a match score, strong matches, real gaps, and a blunt verdict. Runs entirely on your machine using a local Ollama model, so nothing you paste ever leaves your laptop.

## Why

Screening resumes against a JD is repetitive and easy to fool yourself on — you skim, you pattern-match on keywords, and you either talk yourself into a bad fit or miss a good one buried in dense wording. Pasting both into ChatGPT works, but it means sending resumes (often someone else's personal data) to a third-party API, and you're at the mercy of rate limits and cost per call.

This tool exists to do that one job well, locally and for free:

- **Privacy** — resumes and JDs are sensitive. Everything runs against a local Ollama model (`llama3.1` by default), so no text is sent to any external API.
- **Honesty over flattery** — the prompt explicitly tells the model not to soften real gaps or fabricate skills that aren't in the resume. You get a genuine read, not a pep talk.
- **Speed for repeated screening** — if you're screening many candidates against the same JD (or one resume against many JDs), a fast local loop beats copy-pasting into a chat UI over and over.
- **No API key, no bill** — as long as Ollama is running locally, there's no per-request cost.

## Real-world use case

You're a recruiter or hiring manager with 40 resumes and one job description. Instead of manually reading each resume against the JD line by line:

1. Keep the JD text ready once.
2. For each resume, paste it in, hit **Analyze Match**, and in ~15–30 seconds get a score (0–100), a bullet list of what genuinely matches, a bullet list of what's missing, and a short honest verdict ("strong fit," "stretch," or "mismatch," and why).
3. Use the score to triage fast — skip weak fits, prioritize strong ones, and use the "Gaps" section as ready-made interview questions to probe during the screen.

It's equally useful from the other side: as a candidate, paste your resume and a JD you're applying to, and see exactly what a recruiter-style read would flag as missing before you apply — so you can tailor your resume or prep talking points for the gaps.

## How it works

- **Frontend** (`app/page.tsx`) — a single-page Next.js UI with two textareas (resume, JD), streams the model's response token-by-token into the page as it's generated, then parses the structured markdown response into a score ring, a strong-matches list, a gaps list, and an honest-read card.
- **Backend** (`app/api/analyze/route.ts`) — a Next.js API route that sends the resume + JD to a local Ollama server using the OpenAI-compatible `/v1/chat/completions` endpoint (via the `openai` SDK pointed at `localhost:11434`), with a system prompt that enforces the response structure and forbids fabricating skills. The response is streamed straight back to the browser.
- **Model** — any Ollama-compatible chat model; defaults to `llama3.1`.

## Getting started

### 1. Install and start Ollama

```bash
# macOS
brew install ollama
ollama serve
```

Pull the default model (or any model you prefer):

```bash
ollama pull llama3.1
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

`.env.local`:

```bash
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
```

Change `OLLAMA_MODEL` if you're using a different local model (e.g. `mistral`, `qwen2.5`).

### 3. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Use it

1. Paste a resume into the **Resume** box.
2. Paste the job description into the **Job Description** box.
3. Click **Analyze Match**.
4. Read the score, strong matches, gaps, and honest read. (You can cancel mid-stream, and you'll get a desktop notification if the tab isn't focused when it finishes.)

## Tech stack

- Next.js 14 (App Router) + React 18
- TypeScript
- Tailwind CSS
- Ollama (local LLM inference) via the OpenAI SDK's compatible client

## Notes

- All analysis happens locally — no data is sent to OpenAI or any external service, despite using the `openai` npm package (it's just the client library, pointed at your local Ollama server).
- Response quality depends on the local model you choose — larger models generally give more nuanced reads, at the cost of speed.

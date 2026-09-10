"use client";

import { useEffect, useRef, useState } from "react";

type Parsed = {
  score: number | null;
  strongMatches: string[];
  gaps: string[];
  honestRead: string;
  raw: string;
};

function parseOutput(raw: string): Parsed {
  const scoreMatch = raw.match(/Match Score:\s*(\d+)\s*\/\s*100/i);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

  const section = (name: string, nextNames: string[]) => {
    const namesPattern = [name, ...nextNames].join("|");
    const re = new RegExp(
      `###\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n###\\s*(?:${nextNames.join("|")})|$)`,
      "i"
    );
    const m = raw.match(re);
    return m ? m[1].trim() : "";
  };

  const bullets = (text: string) =>
    text
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);

  const strongMatchesText = section("Strong Matches", ["Gaps", "Honest Read"]);
  const gapsText = section("Gaps", ["Honest Read"]);
  const honestReadText = section("Honest Read", ["$"]);

  return {
    score,
    strongMatches: bullets(strongMatchesText),
    gaps: bullets(gapsText),
    honestRead: honestReadText,
    raw,
  };
}

function scoreColor(score: number) {
  if (score >= 75) return { ring: "stroke-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10" };
  if (score >= 50) return { ring: "stroke-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" };
  return { ring: "stroke-red-500", text: "text-red-400", bg: "bg-red-500/10" };
}

function ScoreRing({ score }: { score: number }) {
  const colors = scoreColor(score);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className={`relative w-28 h-28 flex items-center justify-center rounded-full ${colors.bg}`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} className="stroke-gray-700" strokeWidth="8" fill="none" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          className={`${colors.ring} transition-all duration-700 ease-out`}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`text-2xl font-bold ${colors.text}`}>{score}</span>
    </div>
  );
}

function useElapsedSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return seconds;
}

export default function Home() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const elapsed = useElapsedSeconds(loading);

  function notifyDone(body: string) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return;
    const notification = new Notification("JD Match Analyzer", { body });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  async function handleAnalyze() {
    if (!resume.trim() || !jd.trim()) return;
    setOutput("");
    setErrored(false);
    setLoading(true);

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    let finalOutput = "";
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jd }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const text = decoder.decode(value, { stream: true });
          finalOutput += text;
          setOutput((prev) => prev + text);
        }
      }

      const scoreMatch = finalOutput.match(/Match Score:\s*(\d+)\/100/i);
      notifyDone(scoreMatch ? `Analysis ready — Match Score: ${scoreMatch[1]}/100` : "Analysis ready.");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrored(true);
        notifyDone("Analysis failed. Click to check the details.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  function handleClear() {
    setResume("");
    setJd("");
    setOutput("");
    setErrored(false);
  }

  const parsed = output ? parseOutput(output) : null;

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">JD Match Analyzer</h1>
          <p className="text-gray-400 text-sm">
            Paste a resume and a job description. Get a structured fit analysis — matches, gaps, and an honest read.
          </p>
        </div>
        {(resume || jd || output) && !loading && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition shrink-0"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-300">Resume</label>
            <span className="text-xs text-gray-500">{resume.length.toLocaleString()} chars</span>
          </div>
          <textarea
            className="w-full h-64 rounded-lg bg-gray-900 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            placeholder="Paste resume text here..."
            value={resume}
            disabled={loading}
            onChange={(e) => setResume(e.target.value)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-300">Job Description</label>
            <span className="text-xs text-gray-500">{jd.length.toLocaleString()} chars</span>
          </div>
          <textarea
            className="w-full h-64 rounded-lg bg-gray-900 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            placeholder="Paste job description text here..."
            value={jd}
            disabled={loading}
            onChange={(e) => setJd(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!loading ? (
          <button
            onClick={handleAnalyze}
            disabled={!resume.trim() || !jd.trim()}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed font-medium transition"
          >
            Analyze Match
          </button>
        ) : (
          <>
            <button
              disabled
              className="px-5 py-2.5 rounded-lg bg-gray-700 font-medium inline-flex items-center gap-2 cursor-not-allowed"
            >
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing… {elapsed}s
            </button>
            <button
              onClick={handleCancel}
              className="text-sm text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 rounded-lg px-4 py-2.5 transition"
            >
              Cancel
            </button>
          </>
        )}
        {loading && (
          <span className="text-xs text-gray-500">
            Running locally via Ollama — this can take 15–30s depending on your machine.
          </span>
        )}
      </div>

      {errored && (
        <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">
          Something went wrong while analyzing. Make sure Ollama is running locally, then try again.
        </div>
      )}

      {parsed && !errored && (
        <div className="mt-8 space-y-5">
          {parsed.score !== null && (
            <div className="flex items-center gap-5 rounded-lg bg-gray-900 border border-gray-700 p-5">
              <ScoreRing score={parsed.score} />
              <div>
                <div className="text-sm text-gray-400">Match Score</div>
                <div className="text-lg font-semibold">
                  {parsed.score >= 75
                    ? "Strong fit"
                    : parsed.score >= 50
                    ? "Partial fit — worth a closer look"
                    : "Weak fit"}
                </div>
              </div>
            </div>
          )}

          {parsed.strongMatches.length > 0 && (
            <div className="rounded-lg bg-gray-900 border border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Strong Matches
              </h2>
              <ul className="space-y-2 text-sm text-gray-200">
                {parsed.strongMatches.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-500 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.gaps.length > 0 && (
            <div className="rounded-lg bg-gray-900 border border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                Gaps
              </h2>
              <ul className="space-y-2 text-sm text-gray-200">
                {parsed.gaps.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-500 shrink-0">–</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.honestRead && (
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-5">
              <h2 className="text-sm font-semibold text-blue-400 mb-2">Honest Read</h2>
              <p className="text-sm text-gray-200 leading-relaxed">{parsed.honestRead}</p>
            </div>
          )}

          {parsed.score === null &&
            parsed.strongMatches.length === 0 &&
            parsed.gaps.length === 0 &&
            !parsed.honestRead && (
              <div className="rounded-lg bg-gray-900 border border-gray-700 p-5 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                {parsed.raw}
              </div>
            )}
        </div>
      )}
    </main>
  );
}

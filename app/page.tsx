"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleAnalyze() {
    if (!resume.trim() || !jd.trim()) return;
    setOutput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jd }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          setOutput((prev) => prev + decoder.decode(value, { stream: true }));
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setOutput((prev) => prev + "\n\n[Error: could not complete analysis]");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">JD Match Analyzer</h1>
      <p className="text-gray-400 mb-8 text-sm">
        Paste a resume and a job description. Get a streamed, structured fit
        analysis — matches, gaps, and an honest read.
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Resume
          </label>
          <textarea
            className="w-full h-64 rounded-lg bg-gray-900 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste resume text here..."
            value={resume}
            onChange={(e) => setResume(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">
            Job Description
          </label>
          <textarea
            className="w-full h-64 rounded-lg bg-gray-900 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste job description text here..."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || !resume.trim() || !jd.trim()}
        className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed font-medium transition"
      >
        {loading ? "Analyzing..." : "Analyze Match"}
      </button>

      {output && (
        <div className="mt-8 rounded-lg bg-gray-900 border border-gray-700 p-5 whitespace-pre-wrap text-sm leading-relaxed">
          {output}
        </div>
      )}
    </main>
  );
}

import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
  apiKey: "ollama",
});

const MODEL = process.env.OLLAMA_MODEL || "llama3.1";

const SYSTEM_PROMPT = `You are a precise, honest technical recruiter analyzing fit between a resume and a job description.

Respond in this exact structure:

## Match Score: X/100

### Strong Matches
(bullet list of skills/requirements that clearly match, with brief evidence from the resume)

### Gaps
(bullet list of requirements NOT evidenced in the resume — be specific and honest, do not soften real gaps)

### Honest Read
(2-4 sentences: is this a genuine fit, a stretch, or a mismatch, and why — be direct, not diplomatic filler)

Do not fabricate skills or experience not present in the resume. Be concise.`;

export async function POST(req: Request) {
  const { resume, jd } = await req.json();

  if (!resume || !jd) {
    return new Response("Missing resume or job description", { status: 400 });
  }

  let stream;
  try {
    stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      temperature: 0,
      seed: 42,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jd}`,
        },
      ],
    });
  } catch (err) {
    console.error("Ollama request failed:", err);
    return new Response(
      "Could not reach the local Ollama server. Make sure `ollama serve` is running and the model is pulled.",
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        console.error("Ollama stream failed:", err);
        controller.enqueue(
          encoder.encode("\n\n[Error: analysis stream was interrupted. Please try again.]")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

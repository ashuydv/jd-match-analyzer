import OpenAI from "openai";

export const runtime = "edge";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `RESUME:\n${resume}\n\nJOB DESCRIPTION:\n${jd}`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

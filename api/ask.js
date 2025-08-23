// File: api/ask.js  (Vercel Serverless Function - Node runtime)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse body (supports vercel req.body or raw stream fallback)
    const body =
      req.body ||
      (await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => {
          try {
            resolve(JSON.parse(data || "{}"));
          } catch {
            resolve({});
          }
        });
      }));

    let { messages, context, question } = body || {};

    // Backward compatibility: if only "question" is sent, build messages
    if (!messages && typeof question === "string" && question.trim()) {
      messages = [{ role: "user", content: question.trim() }];
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }

    // Prepare system prompt using context
    const ctxText = context ? JSON.stringify(context, null, 2) : "{}";

    const systemPrompt = `
You are "Kalyani's Portfolio Assistant". Answer like a helpful, professional AI assistant.

Use the CONTEXT to answer questions about Kalyani (education, experience, projects, skills).
If a detail is not in the context, say politely: "I don't have that detail in the portfolio context."

Keep answers concise, correct, and helpful. Prefer bullet points for lists.

CONTEXT (JSON):
${ctxText}
`.trim();

    // OpenAI client
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const answer =
      completion?.choices?.[0]?.message?.content?.trim() || "(No answer)";
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

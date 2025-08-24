// File: api/ask.js  (Vercel Serverless Function)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], context = "" } = req.body || {};

    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemMsg = {
      role: "system",
      content:
        `You are an assistant embedded in Kalyani Mohite's personal portfolio website.
Answer concisely and professionally. Prefer information from the portfolio context below.
If something is not present in the context, say you don't have that detail.
PORTFOLIO CONTEXT (extracted from the page):
${context}`
    };

    const chatMessages = [systemMsg, ...messages];

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.7
    });

    const answer = resp.choices?.[0]?.message?.content || "";
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("AI error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

// File: api/ask.js  (Vercel Serverless Function - Node runtime)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    // Import OpenAI dynamically (works with "type": "module")
    const OpenAI = (await import("openai")).default;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: question }],
    });

    const answer = response.choices?.[0]?.message?.content || "(No answer)";
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
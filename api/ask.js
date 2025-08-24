// File: api/ask.js  (Vercel Serverless Function - Node runtime)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, context } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "No question provided" });
    }

    // Import OpenAI dynamically (works with "type": "module")
    const OpenAI = (await import("openai")).default;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build messages for the chat completion, using profile context
    const systemIntro = `
You are "Kalyani's AI Assistant." You answer questions about Kalyani Mohite, using the provided profile/context (education, experience, projects, and skills) from her portfolio site.
If something is not in the context, say you don't have enough information rather than inventing details.
Keep answers clear, concise, and helpful.
`;

    const systemContext = context
      ? `PROFILE CONTEXT (from Kalyani's site):\n${context.substring(0, 12000)}`
      : "No profile context provided.";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemIntro },
        { role: "system", content: systemContext },
        { role: "user", content: question }
      ],
      temperature: 0.3
    });

    const answer = response.choices?.[0]?.message?.content || "(No answer)";
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

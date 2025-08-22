// File: api/ask.js  (Vercel Serverless Function - Node runtime)
import { promises as fs } from "fs";

// Load profile context once when the function is initialized
let PROFILE_CONTEXT = "";

async function loadProfile() {
  try {
    // Read from the deployed file under `public/`
    const raw = await fs.readFile(new URL("../public/profile.json", import.meta.url), "utf-8");
    const data = JSON.parse(raw);

    // Turn JSON into a compact text block the model can use
    const education = (data.education || [])
      .map(e => `${e.degree} at ${e.school} (${e.dates})${e.gpa ? `, GPA ${e.gpa}` : ""}${e.coursework ? `. Coursework: ${e.coursework.join(", ")}` : ""}`)
      .join(" | ");

    const experience = (data.experience || [])
      .map(x => `${x.title} at ${x.company} (${x.dates}) — ${x.highlights?.join("; ")}`)
      .join(" | ");

    const projects = (data.projects || [])
      .map(p => `${p.title}${p.highlights ? ` — ${p.highlights.join("; ")}` : ""}${p.link ? ` (Link: ${p.link})` : ""}`)
      .join(" | ");

    const skills = (data.skills || []).join(", ");

    PROFILE_CONTEXT = [
      `Name: ${data.name}`,
      `Headline: ${data.headline}`,
      `Summary: ${data.summary}`,
      `Education: ${education}`,
      `Experience: ${experience}`,
      `Projects: ${projects}`,
      `Skills: ${skills}`
    ].join("\n");

    console.log("Profile context loaded.");
  } catch (e) {
    console.error("Failed to load profile.json:", e);
    PROFILE_CONTEXT = "";
  }
}

await loadProfile();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = [
      {
        role: "system",
        content:
          "You are an AI assistant embedded in Kalyani Mohite’s portfolio. " +
          "Use the profile context to answer any questions about Kalyani’s education, experience, projects, and skills. " +
          "If the information is not in the context, say you don’t have that info. Be concise, friendly, and accurate."
      },
      {
        role: "system",
        content: `PROFILE CONTEXT:\n${PROFILE_CONTEXT}`
      },
      { role: "user", content: question }
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3
    });

    const answer = response.choices?.[0]?.message?.content || "(No answer)";
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}

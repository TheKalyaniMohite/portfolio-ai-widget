// File: api/ask.js  (Vercel Serverless Function - Node runtime)
import path from "path";
import { readFile } from "fs/promises";

let cachedProfile = null;

async function loadProfile() {
  if (cachedProfile) return cachedProfile;
  try {
    const profilePath = path.join(process.cwd(), "public", "profile.json");
    const json = await readFile(profilePath, "utf8");
    cachedProfile = JSON.parse(json);
  } catch (error) {
    console.error("[api/ask] Failed to load profile.json:", error);
    cachedProfile = null;
  }
  return cachedProfile;
}

function buildSystemPrompt(profile) {
  const safeProfile = profile || {};
  const summaryPieces = [
    `Name: ${safeProfile.name ?? 'N/A'}`,
    `Headline: ${safeProfile.headline ?? 'N/A'}`,
    `Summary: ${safeProfile.summary ?? ''}`,
  ];

  if (Array.isArray(safeProfile.education)) {
    summaryPieces.push(
      'Education:\n' +
      safeProfile.education
        .map((edu) => `- ${edu.degree} at ${edu.school} (${edu.dates ?? 'dates n/a'})`)
        .join('\n')
    );
  }

  if (Array.isArray(safeProfile.experience)) {
    summaryPieces.push(
      'Experience highlights:\n' +
      safeProfile.experience
        .map((job) => {
          const bullets = (job.highlights || []).map((h) => `  • ${h}`).join('\n');
          return `- ${job.title} at ${job.company} (${job.dates ?? 'dates n/a'})\n${bullets}`;
        })
        .join('\n')
    );
  }

  if (Array.isArray(safeProfile.projects)) {
    summaryPieces.push(
      'Projects:\n' +
      safeProfile.projects
        .map((proj) => {
          const bullets = (proj.highlights || []).map((h) => `  • ${h}`).join('\n');
          return `- ${proj.title}\n${bullets}`;
        })
        .join('\n')
    );
  }

  if (Array.isArray(safeProfile.skills)) {
    summaryPieces.push('Skills: ' + safeProfile.skills.join(', '));
  }

  if (Array.isArray(safeProfile.dashboards)) {
    summaryPieces.push(
      'Dashboards:\n' +
      safeProfile.dashboards
        .map((dash) => `- ${dash.title}: ${dash.description}`)
        .join('\n')
    );
  }

  if (Array.isArray(safeProfile.achievements)) {
    summaryPieces.push('Key Achievements:\n' + safeProfile.achievements.map(a => `- ${a}`).join('\n'));
  }

  if (Array.isArray(safeProfile.technical_focus)) {
    summaryPieces.push('Technical Focus Areas:\n' + safeProfile.technical_focus.map(f => `- ${f}`).join('\n'));
  }

  summaryPieces.push(
    `Guidelines: You are Kalyani Mohite's AI assistant. Answer questions about her background, experience, projects, and skills based on the provided information. Be conversational, helpful, and professional. If asked about specific technical details or project implementations, provide insights based on the listed technologies and achievements. For questions outside her profile scope, politely redirect to her portfolio content.`
  );

  return summaryPieces.join('\n\n');
}

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

    const profile = await loadProfile();
    const systemPrompt = buildSystemPrompt(profile);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
    });

    const answer = response.choices?.[0]?.message?.content || "(No answer)";
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import the API handler
let cachedProfile = null;

async function loadProfile() {
  if (cachedProfile) return cachedProfile;
  try {
    const profilePath = path.join(__dirname, 'public', 'profile.json');
    const json = await readFile(profilePath, 'utf8');
    cachedProfile = JSON.parse(json);
  } catch (error) {
    console.error('Failed to load profile.json:', error);
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

  summaryPieces.push(
    'Guidelines: Answer as Kalyani\'s AI assistant. Only use the provided profile information.'
  );

  return summaryPieces.join('\n\n');
}

async function apiHandler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    // Import OpenAI dynamically
    const OpenAI = (await import("openai")).default;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable." 
      });
    }

    const profile = await loadProfile();
    const systemPrompt = buildSystemPrompt(profile);

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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
    return res.status(500).json({ error: "Something went wrong with the AI service." });
  }
}

// API routes
app.post('/api/ask', apiHandler);
app.post('/ask', apiHandler); // Alternative route that the frontend might be using

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at:`);
  console.log(`   - Local:    http://localhost:${PORT}`);
  console.log(`   - Network:  http://localhost:${PORT}`);
  console.log('');
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  Warning: OPENAI_API_KEY not set. AI chat will not work until you set this environment variable.');
  } else {
    console.log('✅ OpenAI API key configured - AI chat should work!');
  }
  console.log('');
});
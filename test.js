import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

console.log("Key loaded:", process.env.OPENAI_API_KEY?.slice(0, 12) + "...");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function run() {
  try {
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: "Hello! Can you introduce yourself in one sentence?",
    });
    console.log("AI Response:", response.output_text);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

run();

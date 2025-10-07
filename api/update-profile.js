// File: api/update-profile.js (Vercel Serverless Function)
import path from "path";
import { readFile, writeFile } from "fs/promises";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { headline, linkedin_profile, headline_last_updated } = req.body || {};
    
    if (!headline) {
      return res.status(400).json({ error: "Headline is required" });
    }

    // Read current profile
    const profilePath = path.join(process.cwd(), "public", "profile.json");
    const currentProfileData = await readFile(profilePath, "utf8");
    const profile = JSON.parse(currentProfileData);

    // Update the relevant fields
    profile.headline = headline;
    if (linkedin_profile) {
      profile.linkedin_profile = linkedin_profile;
    }
    profile.headline_last_updated = headline_last_updated || new Date().toISOString().split('T')[0];

    // Write updated profile back to file
    await writeFile(profilePath, JSON.stringify(profile, null, 2), "utf8");

    // Clear any cached profile data (if your ask.js has caching)
    // You might need to implement cache invalidation here

    return res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully",
      updated_fields: {
        headline,
        linkedin_profile,
        headline_last_updated: profile.headline_last_updated
      }
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}
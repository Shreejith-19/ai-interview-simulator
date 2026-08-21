import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const resumeAnalysisSchema = {
  type: "object",
  properties: {
    skills: {
      type: "array",
      items: { type: "string" },
    },
    technologies: {
      type: "array",
      items: { type: "string" },
    },
    projects: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["skills", "technologies", "projects"],
  additionalProperties: false,
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseStructuredJson = (responseText) => {
  if (!responseText || typeof responseText !== "string") {
    throw new Error("Gemini returned an empty response");
  }

  let parsed;

  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Gemini returned invalid JSON structure");
  }

  if (!Object.prototype.hasOwnProperty.call(parsed, "skills")
    || !Object.prototype.hasOwnProperty.call(parsed, "technologies")
    || !Object.prototype.hasOwnProperty.call(parsed, "projects")) {
    throw new Error("Gemini response is missing one or more required fields");
  }

  return {
    skills: normalizeStringArray(parsed.skills),
    technologies: normalizeStringArray(parsed.technologies),
    projects: normalizeStringArray(parsed.projects),
  };
};

export const analyzeResumeWithGemini = async (resumeText) => {
  if (!resumeText || typeof resumeText !== "string" || !resumeText.trim()) {
    throw new Error("Resume text is required for Gemini analysis");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in .env");
  }

  const prompt = `Analyze the following resume text and extract only structured JSON.

Return valid JSON only in this exact format:
{
  "skills": [],
  "technologies": [],
  "projects": []
}

Instructions:
- Do not include markdown.
- Do not wrap the response inside code blocks.
- Return only valid JSON.
- If a category is missing, return an empty array.
- Extract only the resume information requested.
- Do not generate interview questions.

Resume text:
${resumeText.trim()}`;

const response = await ai.interactions.create({
    model: "gemini-3.5-flash",
    input: prompt,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: resumeAnalysisSchema,
    },
  });

  const responseText = response?.output_text ?? response?.text ?? "";

  return parseStructuredJson(responseText);
};
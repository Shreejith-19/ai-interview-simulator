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

export const generateFirstInterviewQuestion = async ({
  role,
  difficulty,
  interviewType,
  resumeData,
}) => {
  if (!role || !difficulty || !interviewType) {
    throw new Error("Role, difficulty, and interviewType are required to generate an interview question");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in .env");
  }

  let resumeContext = "No resume data provided.";
  if (resumeData) {
    if (typeof resumeData === "string" && resumeData.trim()) {
      resumeContext = resumeData.trim();
    } else if (typeof resumeData === "object") {
      const parts = [];
      if (Array.isArray(resumeData.skills) && resumeData.skills.length > 0) {
        parts.push(`- Skills: ${resumeData.skills.join(", ")}`);
      }
      if (Array.isArray(resumeData.technologies) && resumeData.technologies.length > 0) {
        parts.push(`- Technologies: ${resumeData.technologies.join(", ")}`);
      }
      if (Array.isArray(resumeData.projects) && resumeData.projects.length > 0) {
        parts.push(
          `- Projects:\n  ${resumeData.projects
            .map((proj) => (typeof proj === "string" ? proj : JSON.stringify(proj)))
            .join("\n  ")}`
        );
      }
      if (resumeData.extractedText) {
        parts.push(`- Resume Summary/Content: ${resumeData.extractedText}`);
      }

      if (parts.length > 0) {
        resumeContext = parts.join("\n");
      } else {
        resumeContext = JSON.stringify(resumeData, null, 2);
      }
    }
  }

  const prompt = `You are a professional technical interviewer conducting an interview.
Generate the FIRST interview question for a candidate.

Interview Parameters:
- Target Role: ${role}
- Difficulty Level: ${difficulty}
- Interview Type: ${interviewType}

Candidate Resume Information:
${resumeContext}

Instructions:
1. Tailor the question specifically to the selected role (${role}).
2. Match the complexity strictly to the candidate's difficulty level (${difficulty}):
   - Intern: Focus on core fundamentals, learning aptitude, basic problem-solving, and entry/academic projects.
   - Junior: Focus on hands-on practical experience, common framework patterns, debugging, and applied project knowledge.
   - Senior: Focus on architecture, trade-offs, system design, scalability, edge cases, best practices, or leadership decisions.
3. Match the question style to the interview type (${interviewType}):
   - Technical: Assess technical knowledge, algorithms, language/framework concepts, or code design.
   - Behavioral: Ask a situational/behavioral question (e.g., STAR method, teamwork, conflict, project challenges).
   - System Design: Ask about architecture, component design, scalability, data flow, or trade-offs.
   - Mixed: Ask an initial question bridging practical project experience and technical depth.
4. If candidate resume details (projects, skills, technologies) are available, prioritize asking about a relevant project, skill, or technology listed in their resume.
5. Return ONLY ONE single interview question as plain text.
6. Do NOT include any prefixes (e.g., "Question 1:", "Interviewer:"), markdown formatting, bullet points, greetings, or explanations.`;

  let questionText = "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    questionText = response?.text || "";
  } catch (error) {
    // If gemini-2.5-flash is unavailable for the API key tier, fallback gracefully to gemini-3.5-flash
    if (
      error?.status === 404 ||
      error?.message?.includes("not found") ||
      error?.message?.includes("no longer available")
    ) {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      questionText = fallbackResponse?.text || "";
    } else {
      throw error;
    }
  }

  const cleanedQuestion = questionText.trim().replace(/^["']|["']$/g, "").trim();

  if (!cleanedQuestion) {
    throw new Error("Gemini returned an empty question");
  }

  return cleanedQuestion;
};

export const generateNextInterviewQuestion = async ({
  role,
  difficulty,
  interviewType,
  resumeData,
  conversationHistory = [],
}) => {
  if (!role || !difficulty || !interviewType) {
    throw new Error("Role, difficulty, and interviewType are required to generate the next question");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in .env");
  }

  let resumeContext = "No resume data provided.";
  if (resumeData) {
    if (typeof resumeData === "string" && resumeData.trim()) {
      resumeContext = resumeData.trim();
    } else if (typeof resumeData === "object") {
      const parts = [];
      if (Array.isArray(resumeData.skills) && resumeData.skills.length > 0) {
        parts.push(`- Skills: ${resumeData.skills.join(", ")}`);
      }
      if (Array.isArray(resumeData.technologies) && resumeData.technologies.length > 0) {
        parts.push(`- Technologies: ${resumeData.technologies.join(", ")}`);
      }
      if (Array.isArray(resumeData.projects) && resumeData.projects.length > 0) {
        parts.push(
          `- Projects:\n  ${resumeData.projects
            .map((proj) => (typeof proj === "string" ? proj : JSON.stringify(proj)))
            .join("\n  ")}`
        );
      }
      if (resumeData.extractedText) {
        parts.push(`- Resume Summary/Content: ${resumeData.extractedText}`);
      }

      if (parts.length > 0) {
        resumeContext = parts.join("\n");
      } else {
        resumeContext = JSON.stringify(resumeData, null, 2);
      }
    }
  }

  const formattedHistory = conversationHistory
    .map((item, idx) => {
      const q = item.question || item.q || "";
      const a = item.answer || item.a || "(No answer recorded)";
      return `[Q${idx + 1}]: ${q}\n[Candidate Answer ${idx + 1}]: ${a}`;
    })
    .join("\n\n");

  const prompt = `You are a professional technical interviewer conducting an ongoing interview.
Generate the single NEXT interview question for this candidate based on their background and previous conversation.

Candidate Profile & Session Parameters:
- Target Role: ${role}
- Experience / Difficulty Level: ${difficulty}
- Interview Type: ${interviewType}

Candidate Resume Information:
${resumeContext}

Previous Q&A Conversation History:
${formattedHistory || "No previous questions recorded."}

Instructions & Adaptive Behavior:
1. Technical & Domain Scope: Anchor all questions strictly in the target role (${role}).
2. Difficulty & Complexity: Match the difficulty level (${difficulty}) throughout:
   - Intern: Focus on core fundamentals, learning agility, basic problem-solving, and entry projects.
   - Junior: Focus on hands-on practical experience, common framework patterns, debugging, and applied project knowledge.
   - Senior: Focus on architecture, trade-offs, system design, scalability, edge cases, best practices, and leadership decisions.
3. Interview Style: Follow the interview type (${interviewType}):
   - Behavioral: Focus on the candidate's actual experiences, situational challenges (STAR method), teamwork, resolving conflict, ownership, and handling failure.
   - Technical: Focus on technical concepts, deep dive into languages/frameworks, algorithms, code design, and the candidate's specific technologies/projects.
   - System Design: Progressively explore system architecture, scalability, data partitioning, caching, fault tolerance, API design, and trade-offs.
   - Mixed: Balance technical depth with practical project decision-making.
4. Adaptive Contextual Logic:
   - Carefully analyze the candidate's previous answer(s).
   - If the candidate's previous answer contains an interesting technical point, flaw, trade-off, or topic worth probing deeper, generate a relevant follow-up question.
   - Otherwise, smoothly transition to a new key topic related to the ${role} and ${interviewType}.
   - Absolutely DO NOT repeat or rephrase any previous question from the conversation history.
   - DO NOT ask questions unrelated to ${role} or ${interviewType}.
5. Output format:
   - Return ONLY ONE single next interview question as plain text.
   - Do NOT include any prefixes (e.g., "Question 2:", "Next Question:", "Interviewer:"), numbering, markdown formatting, greetings, or commentary.`;

  let questionText = "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    questionText = response?.text || "";
  } catch (error) {
    if (
      error?.status === 404 ||
      error?.message?.includes("not found") ||
      error?.message?.includes("no longer available")
    ) {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      questionText = fallbackResponse?.text || "";
    } else {
      throw error;
    }
  }

  const cleanedQuestion = questionText.trim().replace(/^["']|["']$/g, "").trim();

  if (!cleanedQuestion) {
    throw new Error("Gemini returned an empty next question");
  }

  return cleanedQuestion;
};

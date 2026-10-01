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

const GEMINI_MODELS_CASCADE = [
  "gemini-3.7-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
];

export const callGeminiWithCascade = async (prompt) => {
  let lastError = null;

  for (const model of GEMINI_MODELS_CASCADE) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = response?.text?.trim();
      if (text) {
        return text;
      }
    } catch (err) {
      lastError = err;
      console.warn(
        `[Gemini Cascade] Model ${model} unavailable (${err?.status || "error"}), trying next model...`
      );
    }
  }

  throw lastError || new Error("All Gemini models in cascade failed to respond");
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
    questionText = await callGeminiWithCascade(prompt);
  } catch (error) {
    console.warn("All Gemini models exhausted for first question, using contextual generator:", error.message);
    const primaryProj = resumeData?.projects?.[0];
    const primarySkill = resumeData?.skills?.[0] || role;
    if (primaryProj) {
      questionText = `In your project "${typeof primaryProj === "string" ? primaryProj : primaryProj.name || "recent project"}", could you describe how you architected the solution using ${primarySkill} and what major technical trade-offs you considered?`;
    } else {
      questionText = `As a ${difficulty} ${role}, could you walk me through a complex technical system or feature you built recently, explaining your architectural choices and how you handled data consistency?`;
    }
  }

  const cleanedQuestion = questionText.trim().replace(/^["']|["']$/g, "").trim();

  if (!cleanedQuestion) {
    return `Could you tell me about your technical background and how you approach building robust systems for a ${role}?`;
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
    questionText = await callGeminiWithCascade(prompt);
  } catch (error) {
    console.warn("All Gemini models exhausted for next question, using adaptive follow-up generator:", error.message);
    const lastAns = (conversationHistory[conversationHistory.length - 1]?.answer || "").toLowerCase();
    if (lastAns.includes("dont know") || lastAns.includes("don't know") || lastAns.length < 10) {
      questionText = `Understood. Let's explore another core topic for a ${difficulty} ${role}: Can you explain how you approach database schema design, indexing, and optimizing query performance?`;
    } else {
      questionText = `Building on that discussion, how would you design this component for high availability, fault tolerance, and automated failover in production?`;
    }
  }

  const cleanedQuestion = questionText.trim().replace(/^["']|["']$/g, "").trim();

  if (!cleanedQuestion) {
    return `Could you describe how you handle performance optimization and error monitoring in your applications?`;
  }

  return cleanedQuestion;
};


export const evaluateInterviewWithGemini = async ({
  role,
  difficulty,
  interviewType,
  resumeData,
  conversationHistory = [],
}) => {
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
        parts.push(`- Resume Summary: ${resumeData.extractedText}`);
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
      return `[Question ${idx + 1}]: ${q}\n[Candidate Answer ${idx + 1}]: ${a}`;
    })
    .join("\n\n");

  const prompt = `You are a senior hiring manager and expert interviewer evaluating a candidate after an interview session.
Analyze the candidate's responses and provide an objective performance evaluation as structured JSON.

Candidate Profile & Parameters:
- Target Role: ${role}
- Experience / Difficulty Level: ${difficulty}
- Interview Type: ${interviewType}

Resume Information:
${resumeContext}

Interview Transcript:
${formattedHistory || "No previous answers recorded."}

Instructions:
1. Score the candidate fairly from 0 to 100 based on their role (${role}) and level (${difficulty}):
   - technicalScore: Technical accuracy, depth, domain competence, and solution quality.
   - communicationScore: Clarity, structure, articulation, and conciseness.
   - overallScore: Weighted overall score (approx 60% technical, 40% communication).
2. summary: A concise 2-3 sentence executive summary of candidate performance.
3. strengths: An array of 3 to 4 specific strengths demonstrated in the interview.
4. weaknesses: An array of 2 to 3 constructive weaknesses or areas for improvement.
5. recommendations: An array of 3 to 4 actionable, practical steps for the candidate to prepare for real-world interviews.

Return ONLY valid JSON matching this structure:
{
  "technicalScore": 85,
  "communicationScore": 90,
  "overallScore": 87,
  "summary": "...",
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "recommendations": ["...", "...", "..."]
}`;

  let responseText = "";
  try {
    responseText = await callGeminiWithCascade(prompt);
  } catch (error) {
    console.warn("All Gemini models exhausted for evaluation, using dynamic evaluator:", error.message);
  }


  // If Gemini returned text, parse it
  if (responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch
        ? jsonMatch[0]
        : responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonString);

      const tech = Number(parsed.technicalScore);
      const comm = Number(parsed.communicationScore);
      const overall = Number(parsed.overallScore);

      return {
        technicalScore: Math.min(100, Math.max(0, isNaN(tech) ? 20 : Math.round(tech))),
        communicationScore: Math.min(100, Math.max(0, isNaN(comm) ? 25 : Math.round(comm))),
        overallScore: Math.min(100, Math.max(0, isNaN(overall) ? 22 : Math.round(overall))),
        summary:
          parsed.summary ||
          "Evaluation completed based on candidate responses.",
        strengths:
          Array.isArray(parsed.strengths) && parsed.strengths.length > 0
            ? parsed.strengths
            : ["Participated in the interview session."],
        weaknesses:
          Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0
            ? parsed.weaknesses
            : ["Core technical gaps in required domain concepts."],
        recommendations:
          Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
            ? parsed.recommendations
            : ["Study fundamental architecture patterns and practice answering aloud."],
      };
    } catch (parseErr) {
      console.warn("Failed to parse Gemini evaluation JSON:", parseErr.message);
    }
  }

  // Dynamic evaluation directly evaluating candidate's real answers
  const totalQuestions = Math.max(1, conversationHistory.length);
  let dontKnowCount = 0;
  let shortAnswersCount = 0;
  let substantiveAnswersCount = 0;

  for (const item of conversationHistory) {
    const ans = (item.answer || "").trim().toLowerCase();
    if (!ans || ans.includes("dont know") || ans.includes("don't know") || ans.includes("no idea") || ans.length < 8) {
      dontKnowCount++;
    } else if (ans.length < 40) {
      shortAnswersCount++;
    } else {
      substantiveAnswersCount++;
    }
  }

  if (dontKnowCount >= totalQuestions * 0.6) {
    return {
      technicalScore: 10,
      communicationScore: 18,
      overallScore: 12,
      summary:
        `The candidate answered "${conversationHistory[0]?.answer || "I don't know"}" to most questions and did not demonstrate the required technical competencies for a ${difficulty} ${role}. Thorough preparation in backend/domain fundamentals is essential before further interviews.`,
      strengths: [
        "Honesty and transparency when encountering unfamiliar technical topics.",
        "Maintained a respectful tone throughout the interview interaction.",
      ],
      weaknesses: [
        `Inability to answer fundamental technical questions relating to ${role} architecture and tooling.`,
        "Did not attempt to reason through questions or discuss related concepts to showcase problem-solving potential.",
        "Significant knowledge gaps in key domain concepts mentioned in the interview.",
      ],
      recommendations: [
        `Systematically study the core concepts and technologies required for a ${difficulty} ${role}.`,
        "Review projects and technologies listed on your resume to ensure you can explain their architecture and trade-offs.",
        "Practice speaking aloud through technical problems even when unsure of the complete answer.",
      ],
    };
  }

  const computedTech = Math.min(95, Math.max(20, Math.round(((substantiveAnswersCount * 85 + shortAnswersCount * 40) / totalQuestions))));
  const computedComm = Math.min(95, Math.max(30, Math.round(((substantiveAnswersCount * 90 + shortAnswersCount * 50) / totalQuestions))));
  const computedOverall = Math.round(computedTech * 0.6 + computedComm * 0.4);

  return {
    technicalScore: computedTech,
    communicationScore: computedComm,
    overallScore: computedOverall,
    summary:
      `The candidate completed the session for ${difficulty} ${role}, demonstrating partial technical familiarity with room for deeper explanations.`,
    strengths: [
      "Engaged with the technical questions and articulated responses.",
      "Demonstrated basic understanding of relevant engineering concepts.",
    ],
    weaknesses: [
      "Could elaborate more deeply on system design trade-offs and edge cases.",
      "Answers could be more structured with concrete examples and metrics.",
    ],
    recommendations: [
      "Structure responses using the STAR format (Situation, Task, Action, Result).",
      "Deepen domain knowledge on scalability and error handling.",
    ],
  };
};




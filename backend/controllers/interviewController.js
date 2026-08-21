import mongoose from "mongoose";
import Interview from "../models/Interview.js";
import {
  generateFirstInterviewQuestion,
  generateNextInterviewQuestion,
} from "../services/geminiService.js";

const VALID_ROLES = [
  "Backend Developer",
  "Frontend Developer",
  "SDE",
  "Data Analyst",
  "DevOps",
];

const VALID_DIFFICULTIES = ["Intern", "Junior", "Senior"];

const VALID_INTERVIEW_TYPES = [
  "Technical",
  "Behavioral",
  "System Design",
  "Mixed",
];

export const startInterview = async (req, res) => {
  try {
    const { role, difficulty, interviewType, resumeData, userId } = req.body;

    if (!role || typeof role !== "string" || !role.trim()) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const matchedRole = VALID_ROLES.find(
      (r) => r.toLowerCase() === role.trim().toLowerCase()
    );
    if (!matchedRole) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed values: ${VALID_ROLES.join(", ")}`,
      });
    }

    if (!difficulty || typeof difficulty !== "string" || !difficulty.trim()) {
      return res.status(400).json({
        success: false,
        message: "Difficulty is required",
      });
    }

    const matchedDifficulty = VALID_DIFFICULTIES.find(
      (d) => d.toLowerCase() === difficulty.trim().toLowerCase()
    );
    if (!matchedDifficulty) {
      return res.status(400).json({
        success: false,
        message: `Invalid difficulty. Allowed values: ${VALID_DIFFICULTIES.join(", ")}`,
      });
    }

    if (!interviewType || typeof interviewType !== "string" || !interviewType.trim()) {
      return res.status(400).json({
        success: false,
        message: "Interview type is required",
      });
    }

    const matchedInterviewType = VALID_INTERVIEW_TYPES.find(
      (t) => t.toLowerCase() === interviewType.trim().toLowerCase()
    );
    if (!matchedInterviewType) {
      return res.status(400).json({
        success: false,
        message: `Invalid interview type. Allowed values: ${VALID_INTERVIEW_TYPES.join(", ")}`,
      });
    }

    // Generate first question with Gemini
    const firstQuestion = await generateFirstInterviewQuestion({
      role: matchedRole,
      difficulty: matchedDifficulty,
      interviewType: matchedInterviewType,
      resumeData: resumeData || null,
    });

    const activeUserId = req.user || userId || null;

    const interview = new Interview({
      userId: activeUserId,
      role: matchedRole,
      difficulty: matchedDifficulty,
      interviewType: matchedInterviewType,
      resumeData: resumeData || null,
      questions: [firstQuestion],
      answers: [],
      status: "in_progress",
    });

    await interview.save();

    return res.status(201).json({
      interviewId: interview._id,
      firstQuestion,
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to start interview session",
    });
  }
};

export const getNextQuestion = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const {
      answer,
      answers,
      previousAnswers,
      previousQuestions,
      role,
      difficulty,
      interviewType,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(interviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interview ID format",
      });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Verify ownership if the interview has an associated userId
    if (interview.userId) {
      if (!req.user || interview.userId.toString() !== req.user.toString()) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You do not have permission to access this interview",
        });
      }
    }

    // If candidate provided a new answer, record it
    if (typeof answer === "string" && answer.trim()) {
      interview.answers.push(answer.trim());
    } else if (Array.isArray(answers) && answers.length > 0) {
      interview.answers = answers;
    } else if (Array.isArray(previousAnswers) && previousAnswers.length > 0) {
      interview.answers = previousAnswers;
    }

    // Determine parameters, prioritizing DB record with optional body fallbacks
    const activeRole = role || interview.role;
    const activeDifficulty = difficulty || interview.difficulty;
    const activeInterviewType = interviewType || interview.interviewType;
    const activeResumeData = interview.resumeData;

    const questionsList =
      interview.questions.length > 0
        ? interview.questions
        : Array.isArray(previousQuestions)
        ? previousQuestions
        : [];

    const answersList = interview.answers || [];

    // Pair up previous Q&A conversation history
    const conversationHistory = questionsList.map((q, idx) => ({
      question: q,
      answer: answersList[idx] || "(Candidate has not answered yet)",
    }));

    // Generate next question with Gemini
    const nextQuestion = await generateNextInterviewQuestion({
      role: activeRole,
      difficulty: activeDifficulty,
      interviewType: activeInterviewType,
      resumeData: activeResumeData,
      conversationHistory,
    });

    // Append new question to interview without overwriting previous data
    interview.questions.push(nextQuestion);
    await interview.save();

    return res.status(200).json({
      interviewId: interview._id,
      nextQuestion,
    });
  } catch (error) {
    console.error("Error generating next question:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate next interview question",
    });
  }
};


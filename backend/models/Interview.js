import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      required: true,
      trim: true,
    },
    interviewType: {
      type: String,
      required: true,
      trim: true,
    },
    resumeData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    questions: {
      type: [String],
      default: [],
    },
    answers: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      default: "in_progress",
      required: true,
      trim: true,
    },
    feedback: {
      technicalScore: { type: Number, default: 0 },
      communicationScore: { type: Number, default: 0 },
      overallScore: { type: Number, default: 0 },
      summary: { type: String, default: "" },
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      recommendations: { type: [String], default: [] },
    },
  },
  {
    timestamps: true,
  }
);

const Interview = mongoose.model("Interview", interviewSchema);

export default Interview;

import { Router } from "express";
import {
  startInterview,
  getNextQuestion,
  getInterviewById,
  evaluateInterview,
  evaluateInterviewDirect,
  getInterviewHistory,
} from "../controllers/interviewController.js";
import protect, { optionalProtect } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/start", optionalProtect, startInterview);
router.post("/evaluate", optionalProtect, evaluateInterviewDirect);
router.get("/history", protect, getInterviewHistory);
router.post("/:interviewId/next-question", optionalProtect, getNextQuestion);
router.get("/:interviewId", optionalProtect, getInterviewById);
router.post("/:interviewId/evaluate", optionalProtect, evaluateInterview);

export default router;





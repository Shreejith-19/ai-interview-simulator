import { Router } from "express";
import {
  startInterview,
  getNextQuestion,
} from "../controllers/interviewController.js";
import { optionalProtect } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/start", optionalProtect, startInterview);
router.post("/:interviewId/next-question", optionalProtect, getNextQuestion);

export default router;


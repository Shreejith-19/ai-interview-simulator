import { Router } from "express";
import { loginUser, registerUser, getCurrentUser } from "../controllers/authController.js";
import protect from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getCurrentUser);

export default router;
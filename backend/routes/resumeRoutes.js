import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import protect from "../middlewares/authMiddleware.js";
import { uploadResume } from "../controllers/resumeController.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempUploadDir = path.join(__dirname, "..", "tmp", "resumes");

fs.mkdirSync(tempUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, callback) => {
    callback(null, tempUploadDir);
  },
  filename: (_, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

const fileFilter = (_, file, callback) => {
  // 1. MIME type check (client-supplied header)
  if (file.mimetype !== "application/pdf") {
    return callback(new Error("Only PDF files are allowed"), false);
  }

  // 2. Magic byte check — read first 4 bytes from the stream to verify real PDF signature
  const chunks = [];
  let bytesRead = 0;
  const stream = file.stream;

  if (!stream || typeof stream.on !== "function") {
    // Stream unavailable (e.g., memory storage); fall back to MIME-only check
    return callback(null, true);
  }

  const onData = (chunk) => {
    chunks.push(chunk);
    bytesRead += chunk.length;
    if (bytesRead >= 4) {
      stream.off("data", onData);
      stream.off("error", onError);
      const header = Buffer.concat(chunks).slice(0, 4);
      if (!header.equals(PDF_MAGIC)) {
        return callback(new Error("File content does not match a valid PDF"), false);
      }
      return callback(null, true);
    }
  };

  const onError = () => {
    stream.off("data", onData);
    callback(new Error("Could not read uploaded file"), false);
  };

  stream.on("data", onData);
  stream.on("error", onError);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/upload", protect, upload.single("resume"), uploadResume);

router.use((error, req, res, next) => {
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid resume upload",
    });
  }

  return next();
});

export default router;
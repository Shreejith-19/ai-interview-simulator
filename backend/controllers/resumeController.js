import fs from "fs/promises";
import { extractResumeText } from "../services/resumeParser.js";

export const uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Resume file is required",
    });
  }

  try {
    const extractedText = await extractResumeText(req.file.path);

    return res.status(200).json({
      success: true,
      message: "Resume uploaded successfully",
      extractedText,
      file: {
        originalFileName: req.file.originalname,
        storedFileName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to process resume",
    });
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  }
};
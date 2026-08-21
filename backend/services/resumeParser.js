import fs from "fs/promises";
import * as pdfParseModule from "pdf-parse";

const pdfParse = pdfParseModule.default ?? pdfParseModule;

export const extractResumeText = async (filePath) => {
  if (!filePath) {
    throw new Error("A PDF file path is required");
  }

  let fileBuffer;

  try {
    fileBuffer = await fs.readFile(filePath);
  } catch {
    throw new Error("Unable to read the uploaded PDF file");
  }

  let parsedPdf;

  try {
    parsedPdf = await pdfParse(fileBuffer);
  } catch {
    throw new Error("The uploaded PDF is invalid or could not be parsed");
  }

  const extractedText = parsedPdf?.text?.trim();

  if (!extractedText) {
    throw new Error("No readable text was found in the PDF");
  }

  return extractedText;
};
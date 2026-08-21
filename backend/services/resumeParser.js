import fs from "fs/promises";
import * as pdfParseModule from "pdf-parse";

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

  let extractedText = "";

  try {
    const PDFParse = pdfParseModule.PDFParse ?? pdfParseModule.default?.PDFParse;
    if (PDFParse && typeof PDFParse === "function") {
      const parser = new PDFParse({ data: fileBuffer });
      const result = await parser.getText();
      if (typeof parser.destroy === "function") {
        await parser.destroy().catch(() => {});
      }

      if (result && typeof result.text === "string") {
        extractedText = result.text.trim();
      } else if (result && Array.isArray(result.pages)) {
        extractedText = result.pages.map((p) => p.text).join("\n").trim();
      }
    } else {
      const parseFn = pdfParseModule.default ?? pdfParseModule;
      if (typeof parseFn === "function") {
        const result = await parseFn(fileBuffer);
        extractedText = result?.text?.trim() || "";
      }
    }
  } catch (error) {
    console.error("PDF Parsing error:", error);
    throw new Error("The uploaded PDF is invalid or could not be parsed");
  }

  if (!extractedText) {
    throw new Error("No readable text was found in the PDF");
  }

  return extractedText;
};
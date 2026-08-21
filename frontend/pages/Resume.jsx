import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const RESUME_UPLOAD_URL = "http://localhost:5000/api/resume/upload";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function Resume() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedResume, setExtractedResume] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setSuccessMessage("");
    setErrorMessage("");
    setExtractedResume(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setSelectedFile(null);
      setErrorMessage("Please upload a valid PDF file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setErrorMessage("File size must not exceed 10 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Please select a PDF file first.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setErrorMessage("Please upload a valid PDF file.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMessage("File size must not exceed 10 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", selectedFile);

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await axios.post(RESUME_UPLOAD_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) {
            return;
          }

          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      setSuccessMessage("Resume uploaded and parsed successfully!");
      if (response.data?.extractedText) {
        setExtractedResume({
          fileName: selectedFile.name,
          text: response.data.extractedText,
        });
      }
      resetForm();
    } catch (uploadError) {
      const message =
        uploadError?.response?.data?.message ||
        uploadError?.message ||
        "Unable to upload or parse resume PDF";
      setErrorMessage(message);
      setIsUploading(false);
    }
  };

  const handleProceedToInterview = () => {
    navigate("/interview/setup", {
      state: {
        resumeData: {
          extractedText: extractedResume?.text,
        },
      },
    });
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="w-full rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Resume Upload</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Upload Your Resume</h2>
          <p className="mt-2 text-sm text-slate-400">
            Upload your PDF resume so the AI interviewer can generate questions tailored to your actual skills and projects.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleUpload}>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 bg-white/5 px-6 py-10 text-center transition hover:border-cyan-400/40 hover:bg-white/10">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">
              PDF file picker
            </span>
            <span className="mt-3 text-lg font-medium text-white">
              {selectedFile ? selectedFile.name : "Click to choose a PDF resume"}
            </span>
            <span className="mt-2 text-sm text-slate-400">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB selected`
                : "Supports standard PDF resumes up to 10 MB"}
            </span>
          </label>

          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Parsing PDF ({uploadProgress}%)...</span>
              </>
            ) : (
              <span>Upload & Parse Resume</span>
            )}
          </button>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Uploading and extracting text...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              ✓ {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              ⚠️ {errorMessage}
            </div>
          )}
        </form>

        {/* Parsed Resume Preview & Action */}
        {extractedResume && (
          <div className="mt-8 border-t border-white/10 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Extracted Resume Content ({extractedResume.fileName}):
              </h3>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-300">
                Ready for Interview
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-300">
              <p className="whitespace-pre-wrap">{extractedResume.text}</p>
            </div>

            <button
              type="button"
              onClick={handleProceedToInterview}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
            >
              <span>Continue to Interview Setup with this Resume →</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
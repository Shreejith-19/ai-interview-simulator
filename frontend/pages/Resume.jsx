import { useRef, useState } from "react";
import axios from "axios";

const RESUME_UPLOAD_URL = "http://localhost:5000/api/resume/upload";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function Resume() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setSuccessMessage("");
    setErrorMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setSelectedFile(null);
      setErrorMessage("Please upload a PDF file.");
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
      setErrorMessage("Please upload a PDF file.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setErrorMessage("Please upload a PDF file.");
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
      await axios.post(RESUME_UPLOAD_URL, formData, {
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

      setSuccessMessage("Resume uploaded successfully.");
      resetForm();
    } catch (uploadError) {
      const message =
        uploadError?.response?.data?.message ||
        uploadError?.message ||
        "Unable to upload resume";
      setErrorMessage(message);
      setIsUploading(false);
    }
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-3xl place-items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Resume</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Upload your resume</h2>
          <p className="mt-2 text-sm text-slate-400">
            Upload a PDF resume to save it temporarily on the backend.
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
              Click to choose a PDF resume
            </span>
            <span className="mt-2 text-sm text-slate-400">
              {selectedFile ? selectedFile.name : "No file selected"}
            </span>
          </label>

          <button
            type="submit"
            disabled={isUploading}
            className="flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Upload progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>

          <p className="text-center text-sm text-slate-400">
            Only PDF files are allowed. Maximum file size: 10 MB.
          </p>

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}
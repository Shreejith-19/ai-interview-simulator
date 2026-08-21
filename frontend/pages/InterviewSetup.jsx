import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ROLES = [
  "Backend Developer",
  "Frontend Developer",
  "SDE",
  "Data Analyst",
  "DevOps",
];

const DIFFICULTIES = ["Intern", "Junior", "Senior"];

const INTERVIEW_TYPES = [
  "Technical",
  "Behavioral",
  "System Design",
  "Mixed",
];

const API_BASE_URL = "http://localhost:5000/api/interview";

export default function InterviewSetup() {
  const navigate = useNavigate();

  const [role, setRole] = useState("Backend Developer");
  const [difficulty, setDifficulty] = useState("Junior");
  const [interviewType, setInterviewType] = useState("Technical");
  const [skills, setSkills] = useState("Node.js, Express, MongoDB, REST APIs");
  const [projects, setProjects] = useState("E-commerce API with JWT authentication and payment integration");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleStartInterview = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const projectsArray = projects
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      const response = await axios.post(`${API_BASE_URL}/start`, {
        role,
        difficulty,
        interviewType,
        resumeData: {
          skills: skillsArray,
          projects: projectsArray,
        },
      });

      const { interviewId, firstQuestion } = response.data;

      navigate("/interview/session", {
        state: {
          interviewId,
          firstQuestion,
          role,
          difficulty,
          interviewType,
        },
      });
    } catch (error) {
      console.error("Failed to start interview:", error);
      // Fallback navigation if backend is unreachable
      const message =
        error?.response?.data?.message ||
        "Could not connect to backend. Starting in offline practice mode.";
      setErrorMessage(message);

      setTimeout(() => {
        navigate("/interview/session", {
          state: {
            interviewId: "offline-session",
            firstQuestion: `Welcome to your ${difficulty} ${role} interview! Let's begin by discussing a technical challenge you encountered recently.`,
            role,
            difficulty,
            interviewType,
          },
        });
      }, 1200);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Configure Session</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Interview Setup</h2>
          <p className="mt-2 text-sm text-slate-400">
            Customize your mock interview parameters to practice real-world scenarios.
          </p>
        </div>

        <form onSubmit={handleStartInterview} className="space-y-6">
          {/* Target Role */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Target Role
            </label>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-2xl border px-4 py-3 text-xs font-medium transition ${
                    role === r
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-md shadow-cyan-950/40"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty & Type Grid */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Experience Level
              </label>
              <div className="mt-2.5 flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-2xl border py-2.5 text-xs font-medium transition ${
                      difficulty === d
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Interview Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Interview Type
              </label>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {INTERVIEW_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setInterviewType(t)}
                    className={`rounded-2xl border py-2 text-xs font-medium transition ${
                      interviewType === t
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Skills Context */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Key Skills & Technologies (Optional)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. React, Node.js, TypeScript, PostgreSQL"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>

          {/* Projects Context */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Key Projects on Resume (Optional)
            </label>
            <textarea
              rows={2}
              value={projects}
              onChange={(e) => setProjects(e.target.value)}
              placeholder="e.g. Developed a microservices backend for payment processing using Express and RabbitMQ"
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3.5 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Generating Question with Gemini...</span>
              </>
            ) : (
              <span>Start Interview Session →</span>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import useAuth from "../context/useAuth.js";

const HISTORY_API_URL = "http://localhost:5000/api/interviews/history";

export default function History() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  useEffect(() => {
    let isMounted = true;

    async function fetchHistory() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await axios.get(HISTORY_API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (isMounted) {
          setHistory(response.data?.history || []);
        }
      } catch (err) {
        console.warn("Failed to fetch interview history:", err);
        if (isMounted) {
          setError(err.response?.data?.message || "Unable to load interview history.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleRecordClick = (interviewId) => {
    if (interviewId) {
      navigate(`/results/${interviewId}`);
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (score >= 65) return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
    if (score >= 50) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    return "bg-rose-500/20 text-rose-300 border-rose-500/40";
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 65) return "text-cyan-400";
    if (score >= 50) return "text-amber-400";
    return "text-rose-400";
  };

  const getProgressBarColor = (score) => {
    if (score >= 80) return "bg-gradient-to-r from-emerald-500 to-teal-400";
    if (score >= 65) return "bg-gradient-to-r from-cyan-500 to-blue-400";
    if (score >= 50) return "bg-gradient-to-r from-amber-500 to-yellow-400";
    return "bg-gradient-to-r from-rose-500 to-red-400";
  };

  // Filter records
  const filteredHistory = history.filter((item) => {
    if (roleFilter !== "All" && item.role !== roleFilter) return false;
    if (difficultyFilter !== "All" && item.difficulty !== difficultyFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Top Banner Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300">
              Candidate Performance Records
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Interview History
            </h1>
            <p className="text-sm text-slate-400">
              Review your past mock interviews, scores, and click any session to open the full detailed report.
            </p>
          </div>

          <Link
            to="/interview/setup"
            className="flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-300"
          >
            <span>+ Start New Interview</span>
          </Link>
        </div>
      </section>

      {/* Guest/Unauthenticated state */}
      {!token && (
        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900/90 p-8 text-center backdrop-blur-xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/10 text-cyan-300">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">Log in to view saved interview records</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Your performance history, technical scores, and AI evaluation feedback are linked to your profile.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="rounded-2xl bg-cyan-400 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold text-white hover:bg-white/10"
            >
              Create Account
            </Link>
          </div>
        </section>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex min-h-[30vh] flex-col items-center justify-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/40 bg-slate-900 shadow-xl">
            <svg className="h-6 w-6 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-xs text-slate-400">Loading interview records...</p>
        </div>
      )}

      {/* Filter Toolbar */}
      {!isLoading && token && history.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Filter:</span>
            
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              <option value="All">All Roles</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="SDE">SDE</option>
              <option value="Data Analyst">Data Analyst</option>
              <option value="DevOps">DevOps</option>
            </select>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              <option value="All">All Levels</option>
              <option value="Intern">Intern</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
            </select>
          </div>

          <span className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredHistory.length}</strong> of {history.length} session{history.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && token && history.length === 0 && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-12 text-center backdrop-blur-xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-400">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">No interview records yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Take a mock interview to get evaluated on technical depth and communication skills.
          </p>
          <div className="pt-2">
            <Link
              to="/interview/setup"
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-cyan-300"
            >
              <span>Start Your First Interview →</span>
            </Link>
          </div>
        </section>
      )}

      {/* Records List (Clicking opens full report) */}
      {!isLoading && filteredHistory.length > 0 && (
        <section className="space-y-4">
          {filteredHistory.map((item) => {
            const formattedDate = item.interviewDate
              ? new Date(item.interviewDate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent";

            return (
              <article
                key={item.interviewId}
                onClick={() => handleRecordClick(item.interviewId)}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400/50 hover:bg-slate-900 hover:shadow-2xl hover:shadow-cyan-950/30"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Role, Difficulty & Date */}
                  <div className="space-y-2 lg:max-w-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-0.5 text-xs font-semibold text-cyan-300">
                        {item.role}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                        {item.difficulty}
                      </span>
                      <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-2.5 py-0.5 text-xs text-purple-300">
                        {item.interviewType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>📅 {formattedDate}</span>
                    </div>

                    {item.summary && (
                      <p className="text-xs text-slate-300 line-clamp-1 italic">
                        "{item.summary}"
                      </p>
                    )}
                  </div>

                  {/* Middle: Scores Breakdown (Technical, Communication, Overall) */}
                  <div className="grid flex-1 grid-cols-3 gap-3 sm:gap-4 max-w-xl">
                    {/* Overall Score */}
                    <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-3.5 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        Overall Score
                      </span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xl font-black text-white sm:text-2xl">
                          {item.overallScore}%
                        </span>
                        <span className={`rounded-lg border px-1.5 py-0.5 text-[10px] font-bold ${getScoreBadge(item.overallScore)}`}>
                          {item.overallScore >= 80 ? "Pass" : item.overallScore >= 50 ? "Fair" : "Low"}
                        </span>
                      </div>
                    </div>

                    {/* Technical Score */}
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3.5 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Technical</span>
                          <span className={getScoreColor(item.technicalScore)}>{item.technicalScore}%</span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getProgressBarColor(item.technicalScore)}`}
                            style={{ width: `${item.technicalScore}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">Score / 100</span>
                    </div>

                    {/* Communication Score */}
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3.5 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Communication</span>
                          <span className={getScoreColor(item.communicationScore)}>{item.communicationScore}%</span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getProgressBarColor(item.communicationScore)}`}
                            style={{ width: `${item.communicationScore}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">Score / 100</span>
                    </div>
                  </div>

                  {/* Right: CTA Arrow */}
                  <div className="flex items-center justify-end">
                    <span className="flex items-center gap-1 text-xs font-semibold text-cyan-400 transition group-hover:translate-x-1 group-hover:text-cyan-300">
                      <span>View Full Report</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
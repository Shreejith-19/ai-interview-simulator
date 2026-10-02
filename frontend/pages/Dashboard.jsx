import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import useAuth from "../context/useAuth.js";

const HISTORY_API_URL = "http://localhost:5000/api/interviews/history";

const statusStyles = {
  completed: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
  in_progress: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30",
};

const statusLabel = {
  completed: "Completed",
  in_progress: "In Progress",
};

const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name || "there";

  const [recentInterviews, setRecentInterviews] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchRecent() {
      if (!token) {
        setIsLoadingHistory(false);
        return;
      }

      try {
        const res = await axios.get(HISTORY_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted) {
          // Take only the 3 most recent (API already returns sorted by -createdAt)
          setRecentInterviews((res.data?.history || []).slice(0, 3));
        }
      } catch {
        // Silently fail — empty state will show
      } finally {
        if (isMounted) setIsLoadingHistory(false);
      }
    }

    fetchRecent();
    return () => { isMounted = false; };
  }, [token]);

  const handleStartInterview = () => {
    navigate("/resume");
  };

  return (
    <section className="space-y-8">
      {/* Welcome Hero */}
      <div className="rounded-3xl border border-white/10 bg-linear-to-br from-cyan-500/15 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-cyan-950/20">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Dashboard</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">Welcome, {displayName}</h2>
          <p className="mt-4 text-slate-300">
            Review your latest interview progress, check recent sessions, and start a new mock interview when you're ready.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleStartInterview}
            className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Start Interview
          </button>
          <Link
            to="/history"
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:border-cyan-400/40 hover:bg-white/10"
          >
            View History
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Recent Activity */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">Recent Interviews</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Recent activity</h3>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* Loading state */}
            {isLoadingHistory && (
              <div className="flex items-center justify-center py-10">
                <svg className="h-6 w-6 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}

            {/* Empty state */}
            {!isLoadingHistory && recentInterviews.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 py-10 text-center">
                <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-slate-400">No activity yet</p>
                <p className="text-xs text-slate-500">Complete your first interview to see it here.</p>
                <button
                  type="button"
                  onClick={handleStartInterview}
                  className="mt-1 rounded-2xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Start your first interview
                </button>
              </div>
            )}

            {/* Real interview records */}
            {!isLoadingHistory && recentInterviews.map((interview) => (
              <article
                key={interview.interviewId}
                onClick={() => navigate(`/results/${interview.interviewId}`)}
                className="flex cursor-pointer flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-cyan-400/20 hover:bg-slate-900 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h4 className="text-base font-semibold text-white">{interview.role}</h4>
                  <p className="mt-1 text-sm text-slate-400">
                    {interview.difficulty} · {interview.interviewType} · {formatDate(interview.interviewDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {interview.status === "completed" && (
                    <span className="text-sm font-semibold text-cyan-300">
                      {interview.overallScore}%
                    </span>
                  )}
                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                      statusStyles[interview.status] || "bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/30"
                    }`}
                  >
                    {statusLabel[interview.status] || interview.status}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* View Full Activity button */}
          {!isLoadingHistory && recentInterviews.length > 0 && (
            <div className="mt-5 flex justify-end">
              <Link
                to="/history"
                className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-white/10 hover:text-white"
              >
                View full activity
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </section>

        {/* Next Step */}
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/10">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">Next Step</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Keep the momentum going</h3>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Start another interview session to improve your technical depth and communication clarity.
          </p>

          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Recommended focus</span>
              <span className="text-cyan-300">System design</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Next goal</span>
              <span className="text-cyan-300">90% overall</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartInterview}
            className="mt-6 w-full rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Start Interview
          </button>
        </aside>
      </div>
    </section>
  );
}
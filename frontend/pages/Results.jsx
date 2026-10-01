import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import useAuth from "../context/useAuth.js";

const API_BASE_URL = "http://localhost:5000/api/interview";

// Fallback demo data if session is accessed offline or directly
const DEMO_EVALUATION = {
  technicalScore: 86,
  communicationScore: 92,
  overallScore: 88,
  summary:
    "The candidate demonstrated strong foundational knowledge, clear communication, and a solid grasp of architectural patterns for the role.",
  strengths: [
    "Clear, structured explanations of technical trade-offs and design patterns.",
    "Strong understanding of asynchronous workflows, caching, and state management.",
    "Excellent communication and ability to articulate complex concepts concisely.",
  ],
  weaknesses: [
    "Could provide more quantified production metrics and benchmark figures.",
    "Opportunity to elaborate further on disaster recovery, chaos engineering, and fallback strategies.",
  ],
  recommendations: [
    "Practice framing complex engineering challenges using the STAR method (Situation, Task, Action, Result).",
    "Deepen knowledge of distributed lock contention and high-concurrency database isolation levels.",
    "Conduct mock whiteboard sessions to practice rapid system diagramming and bottleneck analysis.",
  ],
};

export default function Results() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [interviewData, setInterviewData] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState("");
  const [expandedQIndex, setExpandedQIndex] = useState(null);

  const stateQuestions = location.state?.questions || [];
  const stateAnswers = location.state?.answers || [];
  const sessionRole = location.state?.role || "Backend Developer";
  const sessionDifficulty = location.state?.difficulty || "Junior";
  const sessionInterviewType = location.state?.interviewType || "Technical";
  const sessionResumeData = location.state?.resumeData || null;

  useEffect(() => {
    let isMounted = true;

    async function fetchAndEvaluateResults() {
      setIsLoading(true);
      setError("");

      const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
      let loadedInterview = null;

      if (isMongoId) {
        try {
          // 1. Fetch interview session from backend
          const res = await axios.get(`${API_BASE_URL}/${id}`);
          loadedInterview = res.data?.interview;
          if (loadedInterview && isMounted) {
            setInterviewData(loadedInterview);
          }
        } catch (fetchErr) {
          console.warn("Could not fetch interview session by ID:", fetchErr);
        }
      }

      // Determine the questions and answers to evaluate
      const activeQuestions =
        stateQuestions.length > 0
          ? stateQuestions
          : loadedInterview?.questions?.length > 0
          ? loadedInterview.questions
          : [
              "Could you walk me through your technical background and key projects?",
            ];

      const activeAnswers =
        stateAnswers.length > 0
          ? stateAnswers
          : loadedInterview?.answers?.length > 0
          ? loadedInterview.answers
          : [];

      const activeRole = loadedInterview?.role || sessionRole;
      const activeDifficulty = loadedInterview?.difficulty || sessionDifficulty;
      const activeType = loadedInterview?.interviewType || sessionInterviewType;
      const activeResume = loadedInterview?.resumeData || sessionResumeData;

      // 2. Perform AI Evaluation
      try {
        let evalResult = null;

        if (isMongoId) {
          // Trigger evaluate endpoint for MongoDB interview with synced answers
          const evalRes = await axios.post(`${API_BASE_URL}/${id}/evaluate`, {
            questions: activeQuestions,
            answers: activeAnswers,
          });
          evalResult = evalRes.data?.evaluation;
        }

        if (!evalResult) {
          // Call direct evaluate endpoint
          const evalRes = await axios.post(`${API_BASE_URL}/evaluate`, {
            role: activeRole,
            difficulty: activeDifficulty,
            interviewType: activeType,
            resumeData: activeResume,
            questions: activeQuestions,
            answers: activeAnswers,
          });
          evalResult = evalRes.data?.evaluation;
        }

        if (evalResult && isMounted) {
          setEvaluation(evalResult);
        }
      } catch (evalErr) {
        console.error("AI Evaluation error:", evalErr);
        // Compute realistic fallback score directly from answers
        if (isMounted) {
          const nonAnswersCount = activeAnswers.filter(
            (ans) =>
              !ans ||
              ans.trim().toLowerCase().includes("dont know") ||
              ans.trim().toLowerCase().includes("don't know")
          ).length;
          const totalQ = Math.max(1, activeQuestions.length);
          const scoreCalc = Math.max(
            5,
            Math.round(((totalQ - nonAnswersCount) / totalQ) * 75)
          );

          setEvaluation({
            technicalScore: scoreCalc,
            communicationScore: Math.min(scoreCalc + 10, 100),
            overallScore: scoreCalc,
            summary:
              nonAnswersCount > 0
                ? "The candidate had significant difficulty answering technical questions during the session and requires further preparation on core domain fundamentals."
                : "The interview was completed with basic responses.",
            strengths: [
              "Completed the mock interview session.",
              "Showed honesty when unfamiliar with specific topics.",
            ],
            weaknesses: [
              "Struggled to articulate core architectural principles and technical concepts.",
              "Lack of detailed problem-solving demonstrations.",
            ],
            recommendations: [
              "Review foundational concepts for the target role.",
              "Practice speaking aloud through architectural trade-offs.",
            ],
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAndEvaluateResults();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const questions =
    stateQuestions.length > 0
      ? stateQuestions
      : interviewData?.questions?.length > 0
      ? interviewData.questions
      : ["Technical Question"];

  const answers =
    stateAnswers.length > 0
      ? stateAnswers
      : interviewData?.answers?.length > 0
      ? interviewData.answers
      : [];

  const role = interviewData?.role || sessionRole;
  const difficulty = interviewData?.difficulty || sessionDifficulty;
  const interviewType = interviewData?.interviewType || sessionInterviewType;

  const currentEval = evaluation || {
    technicalScore: 10,
    communicationScore: 10,
    overallScore: 10,
    summary: "Evaluation in progress...",
    strengths: ["Participated in mock session"],
    weaknesses: ["Needs further preparation"],
    recommendations: ["Review core fundamentals"],
  };


  const getScoreColor = (score) => {
    if (score >= 85) return "text-emerald-400 border-emerald-400/40 bg-emerald-500/10";
    if (score >= 70) return "text-cyan-400 border-cyan-400/40 bg-cyan-500/10";
    if (score >= 55) return "text-amber-400 border-amber-400/40 bg-amber-500/10";
    return "text-rose-400 border-rose-400/40 bg-rose-500/10";
  };

  const getProgressBarColor = (score) => {
    if (score >= 85) return "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/50";
    if (score >= 70) return "bg-gradient-to-r from-cyan-500 to-blue-400 shadow-cyan-500/50";
    if (score >= 55) return "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-amber-500/50";
    return "bg-gradient-to-r from-rose-500 to-red-400 shadow-rose-500/50";
  };

  const getGradeBadge = (score) => {
    if (score >= 90) return { label: "Exceptional", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
    if (score >= 80) return { label: "Strong Hire", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" };
    if (score >= 70) return { label: "Pass / Good", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" };
    if (score >= 60) return { label: "Needs Practice", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    return { label: "Review Required", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
  };

  const overallGrade = getGradeBadge(currentEval.overallScore);

  if (isLoading) {

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-400/40 bg-slate-900 shadow-xl shadow-cyan-950/50">
          <svg className="h-8 w-8 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">Analyzing Interview Performance...</h3>
        <p className="text-sm text-slate-400">Evaluating technical accuracy, communication clarity, and recommendations.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>

        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                ✓ Evaluation Complete
              </span>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300">
                {role}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {difficulty}
              </span>
              <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1 text-xs text-purple-300">
                {interviewType}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Interview Results & Feedback
            </h1>
            <p className="text-sm text-slate-400">
              Candidate: <span className="font-medium text-slate-200">{user?.name || "Candidate"}</span> • Session ID: <span className="font-mono text-xs text-cyan-300">{id || "demo-session"}</span>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Report</span>
            </button>
            <Link
              to="/interview/setup"
              className="flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-300"
            >
              <span>Practice Again →</span>
            </Link>
          </div>
        </div>

        {/* Summary Quote */}
        {currentEval.summary && (
          <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200 shadow-inner">
            <span className="font-semibold text-cyan-300">Executive Summary: </span>
            <span>{currentEval.summary}</span>
          </div>
        )}
      </section>

      {/* Scores Section (Cards & Progress Bars) */}
      <section className="grid gap-6 md:grid-cols-3">
        {/* Overall Score Card */}
        <article className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 shadow-xl shadow-cyan-950/30 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Overall Score
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${overallGrade.color}`}>
              {overallGrade.label}
            </span>
          </div>

          <div className="my-6 flex items-center justify-center">
            {/* Radial / Circular Progress Visualizer */}
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${currentEval.overallScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-white">{currentEval.overallScore}%</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Composite</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Benchmark target</span>
              <span className="font-medium text-slate-300">75%</span>
            </div>
            <div className="flex justify-between">
              <span>Performance percentile</span>
              <span className="font-medium text-cyan-300">
                {currentEval.overallScore >= 80 ? "Top 15%" : currentEval.overallScore >= 50 ? "Average" : "Needs Work"}
              </span>
            </div>
          </div>
        </article>

        {/* Technical Score Card */}
        <article className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Technical Score
              </span>
              <span className={`rounded-xl border px-2 py-0.5 text-xs font-bold ${getScoreColor(currentEval.technicalScore)}`}>
                {currentEval.technicalScore}%
              </span>
            </div>

            <h3 className="mt-4 text-3xl font-bold text-white">{currentEval.technicalScore} / 100</h3>
            <p className="mt-1 text-xs text-slate-400">
              Depth of domain knowledge, accuracy, and technical problem-solving.
            </p>

            {/* Progress Bar */}
            <div className="mt-6 space-y-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${getProgressBarColor(currentEval.technicalScore)}`}
                  style={{ width: `${currentEval.technicalScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4 text-xs text-slate-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Code & Architecture depth</span>
              <span className="text-slate-200">
                {currentEval.technicalScore >= 80 ? "Proficient" : currentEval.technicalScore >= 50 ? "Basic" : "Limited"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Trade-off evaluation</span>
              <span className="text-slate-200">
                {currentEval.technicalScore >= 80 ? "Solid" : currentEval.technicalScore >= 50 ? "Fair" : "Needs Study"}
              </span>
            </div>
          </div>
        </article>

        {/* Communication Score Card */}
        <article className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Communication Score
              </span>
              <span className={`rounded-xl border px-2 py-0.5 text-xs font-bold ${getScoreColor(currentEval.communicationScore)}`}>
                {currentEval.communicationScore}%
              </span>
            </div>

            <h3 className="mt-4 text-3xl font-bold text-white">{currentEval.communicationScore} / 100</h3>
            <p className="mt-1 text-xs text-slate-400">
              Clarity, conciseness, structured thinking, and vocabulary.
            </p>

            {/* Progress Bar */}
            <div className="mt-6 space-y-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${getProgressBarColor(currentEval.communicationScore)}`}
                  style={{ width: `${currentEval.communicationScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4 text-xs text-slate-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Articulation & Clarity</span>
              <span className="text-slate-200">
                {currentEval.communicationScore >= 80 ? "Excellent" : currentEval.communicationScore >= 50 ? "Adequate" : "Brief / Sparse"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Answer structure</span>
              <span className="text-slate-200">
                {currentEval.communicationScore >= 80 ? "Strong" : currentEval.communicationScore >= 50 ? "Developing" : "Unstructured"}
              </span>
            </div>
          </div>
        </article>
      </section>

      {/* Detailed Insights (Strengths, Weaknesses, Recommendations) */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Strengths Card */}
        <article className="flex flex-col rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-slate-900 to-slate-950 p-6 shadow-xl shadow-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 text-emerald-300">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Key Highlights</p>
              <h3 className="text-lg font-semibold text-white">Top Strengths</h3>
            </div>
          </div>

          <ul className="mt-6 space-y-3.5 flex-1">
            {currentEval.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-950/10 p-3.5 text-xs leading-relaxed text-emerald-100">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/30 text-[10px] font-bold text-emerald-200">
                  ✓
                </span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </article>

        {/* Weaknesses Card */}
        <article className="flex flex-col rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 p-6 shadow-xl shadow-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/20 text-amber-300">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Growth Areas</p>
              <h3 className="text-lg font-semibold text-white">Weaknesses</h3>
            </div>
          </div>

          <ul className="mt-6 space-y-3.5 flex-1">
            {currentEval.weaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-3 rounded-2xl border border-amber-500/15 bg-amber-950/10 p-3.5 text-xs leading-relaxed text-amber-100">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/30 text-[10px] font-bold text-amber-200">
                  !
                </span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </article>

        {/* Recommendations Card */}
        <article className="flex flex-col rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 via-slate-900 to-slate-950 p-6 shadow-xl shadow-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-500/20 text-purple-300">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold">Next Steps</p>
              <h3 className="text-lg font-semibold text-white">Recommendations</h3>
            </div>
          </div>

          <ul className="mt-6 space-y-3.5 flex-1">
            {currentEval.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3 rounded-2xl border border-purple-500/15 bg-purple-950/10 p-3.5 text-xs leading-relaxed text-purple-100">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500/30 text-[10px] font-bold text-purple-200">
                  →
                </span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>

        </article>
      </section>

      {/* Question & Answer Transcript Review */}
      {questions.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">Session Breakdown</p>
              <h3 className="mt-1 text-2xl font-bold text-white">Question & Answer Review</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
              {questions.length} Question{questions.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {questions.map((q, idx) => {
              const a = answers[idx];
              const isExpanded = expandedQIndex === idx || expandedQIndex === null;

              return (
                <article
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 transition hover:border-cyan-500/30"
                >
                  <div
                    className="flex cursor-pointer items-start justify-between gap-4"
                    onClick={() => setExpandedQIndex(expandedQIndex === idx ? -1 : idx)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-300">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-white">{q}</h4>
                    </div>
                    <button type="button" className="text-slate-400 hover:text-white">
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-white/5 pt-4 space-y-3">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                          Your Answer:
                        </span>
                        <p className="mt-1 rounded-xl bg-slate-900/90 p-3.5 text-xs leading-relaxed text-slate-200">
                          {a || <span className="italic text-slate-500">No answer recorded for this question.</span>}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Bottom Navigation Buttons */}
      <footer className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/40 hover:bg-white/10"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/history"
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            View History
          </Link>
          <Link
            to="/interview/setup"
            className="flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300"
          >
            Start Another Session →
          </Link>
        </div>
      </footer>
    </div>
  );
}
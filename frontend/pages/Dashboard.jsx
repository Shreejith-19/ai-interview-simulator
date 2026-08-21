import useAuth from "../context/useAuth.js";

const recentInterviews = [
  {
    id: 1,
    role: "Frontend Developer",
    company: "Northstar Labs",
    date: "Jun 26, 2026",
    status: "Completed",
  },
  {
    id: 2,
    role: "React Engineer",
    company: "BluePeak AI",
    date: "Jun 24, 2026",
    status: "In Review",
  },
  {
    id: 3,
    role: "Full Stack Developer",
    company: "Orbit Systems",
    date: "Jun 21, 2026",
    status: "Completed",
  },
];

const stats = [
  {
    label: "Technical Score",
    value: "86%",
    note: "+8% from last session",
  },
  {
    label: "Communication Score",
    value: "91%",
    note: "+4% from last session",
  },
  {
    label: "Overall Score",
    value: "88%",
    note: "Consistent performance",
  },
];

const statusStyles = {
  Completed: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
  "In Review": "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30",
};

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user?.name || "there";

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-linear-to-br from-cyan-500/15 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-cyan-950/20">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Dashboard</p>
          <h2 className="mt-3 text-4xl font-semibold text-white">Welcome, {displayName}</h2>
          <p className="mt-4 text-slate-300">
            Review your latest interview progress, check recent sessions, and start a new mock interview when you’re ready.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
            Start Interview
          </button>
          <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:border-cyan-400/40 hover:bg-white/10">
            View History
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/10"
          >
            <p className="text-sm text-slate-400">{stat.label}</p>
            <h3 className="mt-3 text-4xl font-semibold text-white">{stat.value}</h3>
            <p className="mt-2 text-sm text-cyan-200/80">{stat.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">Recent Interviews</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Recent activity</h3>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
              Mock data
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {recentInterviews.map((interview) => (
              <article
                key={interview.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h4 className="text-lg font-semibold text-white">{interview.role}</h4>
                  <p className="mt-1 text-sm text-slate-400">
                    {interview.company} • {interview.date}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${statusStyles[interview.status]}`}
                >
                  {interview.status}
                </span>
              </article>
            ))}
          </div>
        </section>

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

          <button className="mt-6 w-full rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
            Start Interview
          </button>
        </aside>
      </div>
    </section>
  );
}
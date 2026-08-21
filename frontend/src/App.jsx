
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import Home from "../pages/Home.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Resume from "../pages/Resume.jsx";
import InterviewSetup from "../pages/InterviewSetup.jsx";
import InterviewSession from "../pages/InterviewSession.jsx";
import Results from "../pages/Results.jsx";
import History from "../pages/History.jsx";
import ProtectedRoute from "../routes/ProtectedRoute.jsx";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Login", to: "/login" },
  { label: "Register", to: "/register" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Resume", to: "/resume" },
  { label: "Interview Setup", to: "/interview/setup" },
  { label: "Interview Session", to: "/interview/session" },
  { label: "Results", to: "/results/demo-id" },
  { label: "History", to: "/history" },
];

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-white/10 bg-white/5 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">AI Interview Simulator</p>
              <h1 className="text-lg font-semibold">React Router Setup</h1>
            </div>
            <nav className="ml-0 flex flex-wrap gap-2 md:ml-auto">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/interview/setup" element={<InterviewSetup />} />
              <Route path="/interview/session" element={<InterviewSession />} />
              <Route path="/results/:id" element={<Results />} />
              <Route path="/history" element={<History />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

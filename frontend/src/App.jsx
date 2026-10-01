import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
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

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />

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

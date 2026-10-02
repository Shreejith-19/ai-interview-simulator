import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth.js";

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate("/");
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      <header className="border-b border-white/10 bg-white/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              AI Interview Simulator
            </p>
            <h1 className="text-lg font-semibold text-white">React Router Setup</h1>
          </div>

          <nav className="ml-0 flex flex-wrap items-center gap-2 md:ml-auto">
            {/* Home */}
            <Link
              to="/"
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
            >
              Home
            </Link>

            {/* Authentication state conditional rendering */}
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
                >
                  Register
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300"
              >
                Logout
              </button>
            )}

            {/* Navigation Items */}
            <Link
              to="/dashboard"
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              to="/interview/session"
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
            >
              Interview Session
            </Link>

            <Link
              to="/history"
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white"
            >
              History
            </Link>
          </nav>
        </div>
      </header>

      {/* Logout Confirmation Modal Dialog */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
        >
          <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-slate-900/95 p-6 sm:p-8 text-center shadow-2xl shadow-rose-950/30">
            {/* Modal Icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h3
                id="logout-modal-title"
                className="text-xl font-bold text-white"
              >
                Confirm Logout
              </h3>
              <p className="text-sm text-slate-300">
                Are you sure you want to logout?
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelLogout}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import useAuth from "../context/useAuth.js";
import useSpeechRecognition from "../hooks/useSpeechRecognition.js";

const DEFAULT_FIRST_QUESTION =
  "Welcome to your interview! To start off, could you introduce yourself and tell me about a recent challenging project you worked on and the technical decisions you made?";

const API_BASE_URL = "http://localhost:5000/api/interview";

export default function InterviewSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Session metadata from navigation state or default fallback
  const sessionConfig = location.state || {
    interviewId: "session-demo",
    role: "Backend Developer",
    difficulty: "Junior",
    interviewType: "Technical",
    firstQuestion: DEFAULT_FIRST_QUESTION,
  };

  const [messages, setMessages] = useState([
    {
      id: "msg-1",
      sender: "ai",
      text: sessionConfig.firstQuestion || DEFAULT_FIRST_QUESTION,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isSpeakingAi, setIsSpeakingAi] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Store pre-recording text prefix so user-typed text is preserved when speech is appended
  const baseInputPrefixRef = useRef("");

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Web Speech API hook
  const {
    isSupported: isSpeechSupported,
    isRecording,
    interimTranscript,
    liveTranscript,
    error: speechError,
    startRecording,
    stopRecording,
    toggleRecording: toggleSpeech,
    resetTranscript,
  } = useSpeechRecognition({
    onTranscriptChange: (accumulatedFinal, currentInterim) => {
      // Intelligently sync speech into the answer textbox
      const basePrefix = baseInputPrefixRef.current.trim();
      const speechContent = (accumulatedFinal || "") + (currentInterim ? " " + currentInterim : "");

      if (speechContent.trim()) {
        const fullCombined = basePrefix
          ? `${basePrefix} ${speechContent.trim()}`
          : speechContent.trim();
        setInputText(fullCombined);
      }
    },
  });

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Text to Speech for AI messages
  const playSpeech = (text) => {
    if (isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeakingAi(true);
      utterance.onend = () => setIsSpeakingAi(false);
      utterance.onerror = () => setIsSpeakingAi(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeakingAi(false);
    }
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingAi(false);
    }
  };

  // Handle microphone toggle
  const handleMicrophoneClick = () => {
    if (!isRecording) {
      // Capture current text in input as the base prefix before speech recognition begins
      baseInputPrefixRef.current = inputText;
      resetTranscript();
      startRecording();
    } else {
      stopRecording();
    }
  };

  // Handle submitting user answer
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const answer = inputText.trim();
    if (!answer || isAiThinking) return;

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    resetTranscript();
    baseInputPrefixRef.current = "";

    const userMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: answer,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsAiThinking(true);

    try {
      let nextQuestionText = "";
      const interviewId = sessionConfig.interviewId;

      // Check if interviewId looks like a valid 24-char hex MongoDB ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(interviewId);

      if (isValidObjectId) {
        const response = await axios.post(
          `${API_BASE_URL}/${interviewId}/next-question`,
          {
            answer,
            role: sessionConfig.role,
            difficulty: sessionConfig.difficulty,
            interviewType: sessionConfig.interviewType,
          }
        );
        nextQuestionText = response.data?.nextQuestion;
      }

      if (!nextQuestionText) {
        // Fallback simulation for offline or demo sessions
        const nextQNumber = questionCount + 1;
        if (nextQNumber === 2) {
          nextQuestionText = `Thank you for sharing that detailed answer. Digging deeper into your ${sessionConfig.role} experience: how do you typically monitor system performance, identify bottlenecks, and ensure reliable error handling in production?`;
        } else if (nextQNumber === 3) {
          nextQuestionText =
            "Great explanation. Can you tell me about a time when you disagreed with a technical decision made by a team member or stakeholder, and how you resolved the conflict constructively?";
        } else {
          nextQuestionText = `Let's explore architecture and scalability. What specific strategies would you employ to handle high concurrency and prevent cascading failures in your services?`;
        }
      }

      setQuestionCount((prev) => prev + 1);

      const aiMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "ai",
        text: nextQuestionText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (!isMuted) {
        playSpeech(nextQuestionText);
      }
    } catch (err) {
      console.error("Failed to generate next question from backend:", err);
      // Friendly fallback so candidate session is not interrupted
      const fallbackMsg = `Thank you for that response. To continue our discussion regarding your ${sessionConfig.role} background: what is the most complex bug you have diagnosed and fixed in a production system?`;
      setQuestionCount((prev) => prev + 1);

      const aiMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "ai",
        text: fallbackMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMessage]);
      if (!isMuted) {
        playSpeech(fallbackMsg);
      }
    } finally {
      setIsAiThinking(false);
    }
  };


  // Keyboard shortcut: Enter to submit, Shift+Enter for new line
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEndSession = () => {
    stopSpeech();
    if (isRecording) {
      stopRecording();
    }
    navigate(`/results/${sessionConfig.interviewId || "demo-session"}`);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
      {/* Room Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-slate-900/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Interview Room</h2>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-300">
                {sessionConfig.role}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                {sessionConfig.difficulty}
              </span>
              <span className="hidden rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-300 sm:inline-block">
                {sessionConfig.interviewType}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Question <span className="font-medium text-cyan-300">{questionCount}</span> • Web Speech Recognition Enabled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-mono text-cyan-300">
            <svg
              className="h-3.5 w-3.5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <polyline points="12 6 12 12 16 14" strokeWidth="2" />
            </svg>
            <span>{formatTimer(sessionSeconds)}</span>
          </div>

          {/* Sound / TTS Toggle */}
          <button
            type="button"
            onClick={() => {
              if (!isMuted) stopSpeech();
              setIsMuted(!isMuted);
            }}
            title={isMuted ? "Unmute AI Voice" : "Mute AI Voice"}
            className={`rounded-xl border p-2 text-xs transition ${
              isMuted
                ? "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                : "border-cyan-400/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25"
            }`}
          >
            {isMuted ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            )}
          </button>

          {/* End Session Button */}
          <button
            type="button"
            onClick={handleEndSession}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            End Interview
          </button>
        </div>
      </header>

      {/* Chat Messages Area */}
      <main className="chat-scrollbar flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        {/* Welcome Notice Card */}
        <div className="mx-auto max-w-2xl rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-center text-xs text-cyan-200/90 shadow-inner">
          <p className="font-semibold text-cyan-300">💡 Interactive AI Interview</p>
          <p className="mt-1 text-slate-300">
            You can type your answers or speak using the microphone. The live transcript will automatically populate into the textbox, where you can edit or refine your response before submitting.
          </p>
        </div>

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAi ? "justify-start" : "justify-end"}`}
            >
              {/* AI Avatar */}
              {isAi && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-linear-to-br from-cyan-500/30 via-slate-900 to-slate-950 text-cyan-300 shadow-lg shadow-cyan-950/50">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}

              {/* Message Bubble Body */}
              <div className={`max-w-[85%] sm:max-w-[75%] ${isAi ? "items-start" : "items-end"}`}>
                <div className={`mb-1.5 flex items-center gap-2 ${isAi ? "justify-start" : "justify-end"}`}>
                  <span className={`text-xs font-semibold ${isAi ? "text-cyan-300" : "text-slate-300"}`}>
                    {isAi ? "AI Interviewer" : user?.name || "You"}
                  </span>
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>

                <div
                  className={`rounded-3xl px-5 py-4 text-sm leading-relaxed shadow-lg ${
                    isAi
                      ? "rounded-tl-sm border border-cyan-500/20 bg-slate-900/90 text-slate-100 shadow-cyan-950/20"
                      : "rounded-tr-sm border border-cyan-400/30 bg-linear-to-br from-cyan-600 via-cyan-700 to-blue-700 text-white shadow-cyan-900/30"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Optional Voice Replay Button for AI */}
                  {isAi && (
                    <div className="mt-3 flex items-center justify-end border-t border-white/5 pt-2">
                      <button
                        type="button"
                        onClick={() => playSpeech(msg.text)}
                        title="Read question aloud"
                        className="flex items-center gap-1.5 text-xs text-cyan-300/80 transition hover:text-cyan-200"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15.536 8.464a5 5 0 010 7.072M12 6v12l-4-4H4V10h4l4-4z"
                          />
                        </svg>
                        <span>Listen</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* User Avatar */}
              {!isAi && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-linear-to-br from-purple-500/20 to-slate-900 text-purple-300 shadow-lg">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {/* AI Typing / Formulating indicator */}
        {isAiThinking && (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-slate-900 text-cyan-300">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/90 px-4 py-3 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span>AI Interviewer is evaluating your answer...</span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.4s]" />
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Answer Input Dock */}
      <footer className="border-t border-white/10 bg-slate-900/90 p-4 backdrop-blur-md">
        {/* Live Speech Recognition Banner with Real-time Transcript */}
        {isRecording && (
          <div className="mb-3 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-rose-950/40 p-3 shadow-lg shadow-rose-950/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500"></span>
                </span>
                <span className="text-xs font-semibold tracking-wide text-rose-300 uppercase">
                  Live Microphone Recording
                </span>
                {/* Animated sound wave bars */}
                <div className="flex items-center gap-1">
                  <span className="w-1 rounded-full bg-rose-400 animate-pulse-wave-1"></span>
                  <span className="w-1 rounded-full bg-rose-400 animate-pulse-wave-2"></span>
                  <span className="w-1 rounded-full bg-rose-400 animate-pulse-wave-3"></span>
                  <span className="w-1 rounded-full bg-rose-400 animate-pulse-wave-4"></span>
                </div>
              </div>

              {/* Stop Recording button */}
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                <span>Stop Recording</span>
              </button>
            </div>

            {/* Live Transcript Preview */}
            <div className="mt-2.5 rounded-xl border border-white/5 bg-slate-950/60 p-2.5 text-xs">
              <span className="font-medium text-slate-400">Live Transcript: </span>
              <span className="text-slate-200">
                {liveTranscript ? (
                  <>
                    <span>{liveTranscript}</span>
                    {interimTranscript && (
                      <span className="italic text-cyan-300"> ({interimTranscript}...)</span>
                    )}
                  </>
                ) : (
                  <span className="italic text-slate-500">Speak clearly into your microphone...</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Speech Error Banner */}
        {speechError && (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
            <span>⚠️ {speechError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative flex items-end gap-2 rounded-2xl border border-white/15 bg-slate-950/80 p-2 shadow-inner transition-all focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/20">
            {/* Answer Textarea (Fully editable before submission) */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isAiThinking}
              rows={2}
              placeholder={
                isRecording
                  ? "Transcribing your speech in real-time... (You can edit text directly anytime)"
                  : "Type your answer or click the microphone to speak... (Press Enter to submit, Shift+Enter for new line)"
              }
              className="max-h-36 min-h-[48px] w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
            />

            <div className="flex items-center gap-2 pb-1 pr-1">
              {/* Microphone Toggle Button */}
              <button
                type="button"
                onClick={handleMicrophoneClick}
                disabled={isAiThinking || !isSpeechSupported}
                title={
                  !isSpeechSupported
                    ? "Speech recognition is not supported in this browser"
                    : isRecording
                    ? "Click to stop recording"
                    : "Click to start recording your answer"
                }
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isRecording
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/50 ring-4 ring-rose-500/30"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-cyan-300"
                }`}
              >
                {isRecording ? (
                  <svg className="h-5 w-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                )}
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isAiThinking}
                title="Submit your answer"
                className="flex h-11 items-center gap-2 rounded-xl bg-cyan-400 px-4 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-cyan-400"
              >
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Submit</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 12h14M12 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between px-1 text-[11px] text-slate-500">
            <span>
              Press <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-slate-400">Enter ↵</kbd> to submit, <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-slate-400">Shift + Enter</kbd> for new line • Voice editable before submission
            </span>
            <span>
              {inputText.trim() ? `${inputText.trim().split(/\s+/).length} words` : "0 words"} • {inputText.length} chars
            </span>
          </div>
        </form>
      </footer>
    </div>
  );
}
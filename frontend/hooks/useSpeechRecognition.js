import { useCallback, useEffect, useRef, useState } from "react";

export default function useSpeechRecognition({ onTranscriptChange } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const isManuallyStoppedRef = useRef(false);
  const onTranscriptChangeRef = useRef(onTranscriptChange);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Error stopping speech recognition:", err);
      }
    }
    setIsRecording(false);
    setInterimTranscript("");
  }, []);

  const startRecording = useCallback(() => {
    setError("");
    setInterimTranscript("");

    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      setIsSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      isManuallyStoppedRef.current = false;

      recognition.onstart = () => {
        setIsRecording(true);
        setError("");
      };

      recognition.onresult = (event) => {
        let currentInterim = "";
        let currentFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript;
          if (res.isFinal) {
            currentFinal += text + " ";
          } else {
            currentInterim += text;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => {
            const next = (prev ? prev.trim() + " " : "") + currentFinal.trim();
            if (onTranscriptChangeRef.current) {
              onTranscriptChangeRef.current(next, currentInterim);
            }
            return next;
          });
        }

        setInterimTranscript(currentInterim);
        if (currentInterim && onTranscriptChangeRef.current) {
          onTranscriptChangeRef.current(null, currentInterim);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error event:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Microphone permission denied. Please allow microphone access in your browser settings.");
          setIsRecording(false);
        } else if (event.error === "audio-capture") {
          setError("No microphone detected. Please connect a microphone and try again.");
          setIsRecording(false);
        } else if (event.error === "network") {
          setError("Network issue with speech recognition service.");
          setIsRecording(false);
        } else if (event.error !== "no-speech") {
          setError(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // In some browsers, continuous speech recognition might end after a period of silence.
        // If not manually stopped, we can restart it to keep user experience seamless.
        if (!isManuallyStoppedRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            // If restart fails, settle recording state
          }
        }
        setIsRecording(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to initialize SpeechRecognition:", err);
      setError("Failed to start speech recognition. Please check your browser permissions.");
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isRecording,
    transcript,
    interimTranscript,
    liveTranscript: (transcript + (interimTranscript ? " " + interimTranscript : "")).trim(),
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    resetTranscript,
    setTranscript,
  };
}

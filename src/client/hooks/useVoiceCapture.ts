import { useState, useRef, useCallback } from "preact/hooks";

interface SpeechRecognitionResult {
  [index: number]: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEvent {
  results: { [index: number]: SpeechRecognitionResult; length: number };
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export type VoiceState = "idle" | "listening" | "error";

interface UseVoiceCapture {
  supported: boolean;
  state: VoiceState;
  transcript: string;
  error: string;
  start: () => void;
  stop: () => void;
  clear: () => void;
}

export function useVoiceCapture(): UseVoiceCapture {
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognitionClass;

  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState("idle");
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionClass) {
      setError("Voice not supported in this browser");
      setState("error");
      return;
    }

    // Stop any existing session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Rebuild full transcript from all result segments
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript;
        if (text && segment && !text.endsWith(" ") && !segment.startsWith(" ")) {
          text += " ";
        }
        text += segment;
      }
      setTranscript(text.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return; // Not real errors — stay listening
      }
      setError(event.error);
      setState("error");
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // With continuous=true, onend only fires if the browser force-stops
      // (e.g. long silence timeout). Don't change state — user controls stop.
      recognitionRef.current = null;
      setState("idle");
    };

    recognitionRef.current = recognition;
    setError("");
    setState("listening");
    recognition.start();
  }, [SpeechRecognitionClass, state]);

  const clear = useCallback(() => {
    setTranscript("");
    setError("");
    setState("idle");
  }, []);

  return { supported, state, transcript, error, start, stop, clear };
}

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2, VolumeX, Pause, Play } from "lucide-react";

const ReadAloud = ({ contentSelector = ".blog-content" }: { contentSelector?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  const speak = useCallback(() => {
    const el = document.querySelector(contentSelector);
    if (!el) return;

    const text = (el as HTMLElement).innerText || el.textContent || "";
    if (!text.trim()) return;

    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && v.name.includes("Google"),
    );
    if (preferred) utterance.voice = preferred;
    else {
      const english = voices.find((v) => v.lang.startsWith("en"));
      if (english) utterance.voice = english;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  }, [contentSelector, rate, stop]);

  const pause = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-1.5 bg-black-200 border border-black-50 rounded-lg px-2 py-1.5">
      {!isPlaying ? (
        <button
          onClick={speak}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-white-50/60 hover:text-foreground hover:bg-black-100 transition-colors"
          title="Read aloud"
        >
          <Volume2 className="size-3.5" />
          <span className="hidden sm:inline">Listen</span>
        </button>
      ) : (
        <>
          <button
            onClick={pause}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-blue-50 hover:bg-black-100 transition-colors"
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </button>
          <button
            onClick={stop}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-white-50/60 hover:text-foreground hover:bg-black-100 transition-colors"
            title="Stop"
          >
            <VolumeX className="size-3.5" />
          </button>
        </>
      )}
      {isPlaying && (
        <select
          value={rate}
          onChange={(e) => {
            setRate(Number(e.target.value));
            if (isPlaying) {
              stop();
              setTimeout(() => speak(), 50);
            }
          }}
          className="text-xs bg-transparent border-l border-black-50 pl-1.5 py-0.5 text-white-50/50 outline-none cursor-pointer"
        >
          <option value={0.75}>0.75x</option>
          <option value={1}>1x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      )}
    </div>
  );
};

export default ReadAloud;

import { useEffect, useState, useRef, useMemo } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";
import {
  Compass,
  Briefcase,
  Users,
  Coffee,
  Clock,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { calMeetings, type CalMeeting } from "../../constants";
import CalScheduleCanvas from "./CalScheduleCanvas";
import { tap } from "../lib/haptics";

const ICONS = {
  "project-discovery": Compass,
  "opportunity-chat": Briefcase,
  "collab-sync": Users,
  "quick-chat": Coffee,
} as const;

interface CalSchedulerProps {
  initialSlug?: string;
  onSwitchToMessage?: () => void;
  className?: string;
}

export const CalScheduler = ({
  initialSlug = "quick-chat",
  onSwitchToMessage,
  className = "",
}: CalSchedulerProps) => {
  const [activeSlug, setActiveSlug] = useState<string>(() => {
    return calMeetings.some((m) => m.slug === initialSlug)
      ? initialSlug
      : calMeetings[0].slug;
  });
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const activeMeeting: CalMeeting = useMemo(() => {
    return calMeetings.find((m) => m.slug === activeSlug) || calMeetings[0];
  }, [activeSlug]);

  // Track theme changes to instruct Cal.com iframe theme
  useEffect(() => {
    const updateTheme = () => {
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Initialize Cal.com UI config
  useEffect(() => {
    let unmounted = false;
    (async function initCal() {
      try {
        const cal = await getCalApi();
        if (unmounted) return;
        cal("ui", {
          theme: isDark ? "dark" : "light",
          styles: {
            branding: { brandColor: "#0b1020" },
          },
          hideEventTypeDetails: false,
          layout: "month_view",
        });
      } catch (err) {
        console.warn("Cal API initialization warning:", err);
      }
    })();
    return () => {
      unmounted = true;
    };
  }, [isDark]);

  // Reset loading spinner on meeting change
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, [activeSlug]);

  const selectMeeting = (slug: string) => {
    if (slug === activeSlug) return;
    tap(10);
    setActiveSlug(slug);
    setPulseTrigger((prev) => prev + 1);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col gap-6 ${className}`}
    >
      {/* Interactive HTML5 Canvas background */}
      <CalScheduleCanvas
        accentColor={activeMeeting.color}
        pulseTrigger={pulseTrigger}
      />

      {/* Meeting types header selector */}
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-white-50/80">
            <Sparkles className="size-4 text-cyan-400" />
            <span className="font-medium text-foreground">
              Select meeting type
            </span>
            <span className="text-white-50/50">&middot;</span>
            <span className="text-white-50/60">Hosted over Google Meet</span>
          </div>

          {onSwitchToMessage && (
            <button
              type="button"
              onClick={onSwitchToMessage}
              className="inline-flex items-center gap-1.5 text-xs text-white-50/70 hover:text-foreground transition-colors cursor-pointer group"
            >
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
              Prefer to send a message instead?
            </button>
          )}
        </div>

        {/* 4 Meeting Options Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {calMeetings.map((meeting) => {
            const Icon =
              ICONS[meeting.id as keyof typeof ICONS] || Compass;
            const isSelected = meeting.slug === activeSlug;

            return (
              <button
                key={meeting.id}
                type="button"
                onClick={() => selectMeeting(meeting.slug)}
                className={`relative text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 backdrop-blur-md group ${
                  isSelected
                    ? "bg-zinc-100/90 dark:bg-black-100/90 border-cyan-500/70 dark:border-cyan-400/60 shadow-[0_0_24px_-4px_rgba(34,211,238,0.25)] ring-1 ring-cyan-500/40"
                    : "bg-white/50 dark:bg-black-200/50 border-black-50 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white/80 dark:hover:bg-black-100/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div
                      className="size-9 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: `${meeting.color}15`,
                        borderColor: `${meeting.color}35`,
                        color: meeting.color,
                      }}
                    >
                      <Icon className="size-4.5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300/40 dark:border-zinc-700/50">
                        <Clock className="size-3 opacity-70" />
                        {meeting.duration}
                      </span>
                      {isSelected && (
                        <CheckCircle2
                          className="size-4 shrink-0"
                          style={{ color: meeting.color }}
                        />
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-semibold text-foreground line-clamp-1">
                    {meeting.title}
                  </h4>
                  <p className="text-xs text-white-50/70 leading-relaxed mt-1 line-clamp-2">
                    {meeting.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black-50/40 text-[11px] text-white-50/50">
                  <span className="font-mono tracking-tight text-[10px] uppercase text-cyan-400/90 dark:text-cyan-400">
                    {meeting.badge}
                  </span>
                  <span className="group-hover:translate-x-0.5 transition-transform duration-150">
                    {isSelected ? "Active slot" : "Select →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cal.com Embed Container */}
      <div className="relative z-10 w-full rounded-2xl sm:rounded-3xl border border-black-50 card-border bg-white/80 dark:bg-[#0c101a]/85 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Top bar inside card */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 sm:px-7 py-3.5 border-b border-black-50 bg-black-200/40 dark:bg-black-200/25">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex size-2.5 shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ backgroundColor: activeMeeting.color }}
              />
              <span
                className="relative inline-flex size-2.5 rounded-full"
                style={{ backgroundColor: activeMeeting.color }}
              />
            </span>
            <div className="flex items-center gap-2 truncate text-xs sm:text-sm font-medium">
              <span className="text-foreground truncate">
                {activeMeeting.title}
              </span>
              <span className="text-white-50/40">&middot;</span>
              <span className="text-white-50/70 hidden sm:inline">
                {activeMeeting.duration}
              </span>
              <span className="text-white-50/40 hidden sm:inline">&middot;</span>
              <span className="text-white-50/60 text-xs hidden md:inline">
                Google Meet
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white-50/60 hidden lg:inline font-mono">
              Auto-timezone sync
            </span>
            <a
              href={activeMeeting.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-black-50 bg-black-200/60 hover:bg-black-50 text-white-50/90 hover:text-foreground transition-all cursor-pointer"
            >
              <Calendar className="size-3.5" />
              <span>Open in Cal.com</span>
              <ExternalLink className="size-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* Live Cal.com Embed Frame */}
        <div className="relative w-full min-h-[640px] h-[680px] sm:h-[720px] overflow-hidden bg-transparent">
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/70 dark:bg-[#0c101a]/80 backdrop-blur-sm transition-opacity">
              <div
                className="size-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${activeMeeting.color} transparent` }}
              />
              <p className="text-xs sm:text-sm text-white-50/70 font-mono">
                Connecting to Sachin's calendar...
              </p>
            </div>
          )}

          <Cal
            key={`${activeMeeting.slug}-${isDark ? "dark" : "light"}`}
            calLink={activeMeeting.calLink}
            style={{
              width: "100%",
              height: "100%",
              minHeight: "640px",
              overflow: "scroll",
            }}
            config={{
              layout: "month_view",
              theme: isDark ? "dark" : "light",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CalScheduler;

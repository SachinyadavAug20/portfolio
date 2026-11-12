import { useEffect, useState, useRef, useMemo } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";
import {
  Compass,
  Briefcase,
  Users,
  Coffee,
  ExternalLink,
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
  className?: string;
}

export const CalScheduler = ({
  initialSlug = "quick-chat",
  className = "",
}: CalSchedulerProps) => {
  const [activeSlug, setActiveSlug] = useState<string>(() => {
    return calMeetings.some((m) => m.slug === initialSlug)
      ? initialSlug
      : calMeetings[0].slug;
  });
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const activeMeeting: CalMeeting = useMemo(() => {
    return calMeetings.find((m) => m.slug === activeSlug) || calMeetings[0];
  }, [activeSlug]);

  // Sync theme
  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Configure Cal.com theme and style
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
        console.warn("Cal API warning:", err);
      }
    })();
    return () => {
      unmounted = true;
    };
  }, [isDark]);

  const selectMeeting = (slug: string) => {
    if (slug === activeSlug) return;
    tap(8);
    setActiveSlug(slug);
    setPulseTrigger((prev) => prev + 1);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col gap-3 sm:gap-4 ${className}`}
    >
      {/* Interactive HTML5 Canvas background */}
      <CalScheduleCanvas
        accentColor={activeMeeting.color}
        pulseTrigger={pulseTrigger}
      />

      {/* Top Bar: Clean SVG icon selector + External link */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        {/* Responsive pill tabs (scrolls smoothly on mobile, flex on tablet/desktop) */}
        <div
          role="tablist"
          aria-label="Meeting options"
          className="flex items-center gap-1.5 p-1 rounded-2xl border border-black-50 bg-black-200/90 dark:bg-black-100/90 backdrop-blur-md overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 min-w-0"
        >
          {calMeetings.map((meeting) => {
            const Icon = ICONS[meeting.id as keyof typeof ICONS] || Compass;
            const isSelected = meeting.slug === activeSlug;

            return (
              <button
                key={meeting.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => selectMeeting(meeting.slug)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-medium transition-all duration-200 shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-white text-zinc-950 dark:bg-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-cyan-500/50"
                    : "text-white-50/70 hover:text-foreground hover:bg-black-50/40"
                }`}
              >
                <span
                  className="size-5 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? `${meeting.color}25`
                      : "transparent",
                  }}
                >
                  <Icon
                    className="size-3.5 shrink-0"
                    style={{ color: meeting.color }}
                  />
                </span>
                <span className="font-medium whitespace-nowrap">
                  {meeting.title}
                </span>
                {meeting.duration && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hidden xs:inline">
                    {meeting.duration}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Direct link button with SVG icon */}
        <a
          href={activeMeeting.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${activeMeeting.title} directly in Cal.com`}
          title="Open in Cal.com"
          className="size-9 rounded-2xl border border-black-50 bg-black-200/90 dark:bg-black-100/90 backdrop-blur-md hover:bg-black-50 text-white-50/80 hover:text-foreground flex items-center justify-center transition-all cursor-pointer shrink-0"
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      {/* Embedded Cal.com Frame */}
      <div className="relative z-10 w-full rounded-2xl sm:rounded-3xl border border-black-50 card-border bg-white/80 dark:bg-[#0c101a]/85 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="relative w-full min-h-[580px] h-[640px] sm:h-[680px] md:h-[700px] overflow-hidden bg-transparent">
          <Cal
            key={`${activeMeeting.slug}-${isDark ? "dark" : "light"}`}
            calLink={activeMeeting.calLink}
            style={{
              width: "100%",
              height: "100%",
              minHeight: "580px",
              overflow: "auto",
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

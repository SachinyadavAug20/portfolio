import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Home, LayoutGrid, Briefcase, Calendar, BookOpen } from "lucide-react";
import { tap } from "../lib/haptics";
import { scrollToY } from "../lib/smoothScroll";

const MotionLink = motion.create(Link);

interface Tab {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
  badge?: boolean;
}

const tabs: Tab[] = [
  { id: "home", label: "Home", href: "/", icon: Home },
  { id: "work", label: "Projects", href: "/#work", icon: LayoutGrid },
  { id: "experience", label: "Timeline", href: "/#experience", icon: Briefcase },
  { id: "schedule", label: "Book Call", href: "/#schedule", icon: Calendar, badge: true },
  { id: "blog", label: "Blog", href: "/blog", icon: BookOpen },
];

const BottomTabBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>("home");

  // Native live scroll-spy: updates active tab as user scrolls through sections
  useEffect(() => {
    if (pathname.startsWith("/blog")) {
      setActiveSection("blog");
      return;
    }
    if (pathname !== "/") {
      setActiveSection("");
      return;
    }

    let raf = 0;
    const compute = () => {
      raf = 0;
      const vh = window.innerHeight;
      const mid = vh * 0.4;

      const scheduleEl = document.getElementById("schedule") || document.getElementById("contact");
      if (scheduleEl && scheduleEl.getBoundingClientRect().top <= mid) {
        setActiveSection("schedule");
        return;
      }

      const expEl = document.getElementById("experience");
      if (expEl && expEl.getBoundingClientRect().top <= mid) {
        setActiveSection("experience");
        return;
      }

      const workEl = document.getElementById("work");
      if (workEl && workEl.getBoundingClientRect().top <= mid) {
        setActiveSection("work");
        return;
      }

      setActiveSection("home");
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  const isActive = (tab: Tab) => {
    if (tab.id === "blog") return pathname.startsWith("/blog");
    if (pathname !== "/") return false;
    return activeSection === tab.id;
  };

  const handleClick = (e: React.MouseEvent, tab: Tab) => {
    tap(10);
    if (!tab.href.startsWith("/#")) return;
    e.preventDefault();
    const target = tab.href.slice(2);
    const wasHome = pathname === "/";
    setActiveSection(tab.id);

    const scroll = () => {
      const el = target === "schedule"
        ? (document.getElementById("schedule") || document.getElementById("contact"))
        : document.getElementById(target);
      if (el) {
        scrollToY(el.getBoundingClientRect().top + window.scrollY);
      }
    };

    if (wasHome) {
      navigate({ pathname: "/", hash: `#${target}` }, { replace: true });
      requestAnimationFrame(scroll);
    } else {
      navigate({ pathname: "/", hash: `#${target}` });
      setTimeout(scroll, 350);
    }
  };

  return (
    <nav className="bottom-tabbar" aria-label="Mobile Navigation">
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <MotionLink
            key={tab.id}
            to={tab.href}
            onClick={(e) => handleClick(e, tab)}
            className={`bottom-tab ${active ? "active text-cyan-400" : ""}`}
            aria-current={active ? "page" : undefined}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 600, damping: 25 }}
          >
            <div className="relative flex items-center justify-center">
              <Icon
                className="bottom-tab-icon"
                strokeWidth={active ? 2.4 : 1.7}
              />
              {tab.badge && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </div>
            <span className="bottom-tab-label">{tab.label}</span>
          </MotionLink>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;

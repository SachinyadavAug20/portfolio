import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Home, LayoutGrid, BookOpen, Mail } from "lucide-react";
import { tap } from "../lib/haptics";
import { scrollToY } from "../lib/smoothScroll";

const MotionLink = motion.create(Link);

interface Tab {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
}

const tabs: Tab[] = [
  { id: "home", label: "Home", href: "/", icon: Home },
  { id: "work", label: "Work", href: "/#work", icon: LayoutGrid },
  { id: "blog", label: "Blog", href: "/blog", icon: BookOpen },
  { id: "contact", label: "Contact", href: "/#contact", icon: Mail },
];

const BottomTabBar = () => {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();

  const isActive = (tab: Tab) => {
    if (tab.id === "blog") return pathname.startsWith("/blog");
    if (pathname !== "/") return false;
    if (tab.id === "home") return !hash || hash === "#hero" || hash === "/";
    if (tab.id === "work") return hash === "#work";
    if (tab.id === "contact") return hash === "#contact";
    return false;
  };

  const handleClick = (e: React.MouseEvent, tab: Tab) => {
    tap(8);
    if (!tab.href.startsWith("/#")) return;
    e.preventDefault();
    const target = tab.href.slice(2);
    const wasHome = pathname === "/";
    navigate({ pathname: "/", hash: `#${target}` });
    const scroll = () => {
      const el = document.getElementById(target);
      if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY);
    };
    if (wasHome) {
      requestAnimationFrame(scroll);
    } else {
      setTimeout(scroll, 450);
    }
  };

  return (
    <nav className="bottom-tabbar" aria-label="Primary">
      {tabs.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <MotionLink
            key={tab.id}
            to={tab.href}
            onClick={(e) => handleClick(e, tab)}
            className={`bottom-tab ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 650, damping: 30 }}
          >
            <Icon className="bottom-tab-icon" strokeWidth={active ? 2.2 : 1.7} />
            <span className="bottom-tab-label">{tab.label}</span>
          </MotionLink>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;

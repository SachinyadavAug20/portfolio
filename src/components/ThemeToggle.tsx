import { useRef } from "react";
import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";
import { tap } from "../lib/haptics";

const ThemeToggle = () => {
  const { toggleTheme, resolvedTheme } = useTheme();
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    tap(8);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;
    toggleTheme({ x, y });
  };

  return (
    <div className="theme-toggle relative">
      <motion.button
        ref={btnRef}
        type="button"
        className="theme-toggle-btn"
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.06 }}
        transition={{ type: "spring", stiffness: 650, damping: 30 }}
        onClick={handleClick}
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      >
        <span className="theme-toggle-sun">
          <Sun className="size-5" />
        </span>
        <span className="theme-toggle-moon">
          <Moon className="size-5" />
        </span>
        <span className="sr-only">
          Toggle theme (currently {resolvedTheme})
        </span>
      </motion.button>
    </div>
  );
};

export default ThemeToggle;

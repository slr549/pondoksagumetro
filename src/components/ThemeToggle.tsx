import { useState, useEffect } from "react";
import { Sun, Moon, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const themes = ["dark", "light", "pink"] as const;
type Theme = (typeof themes)[number];

const themeLabels: Record<Theme, string> = {
  dark: "Beralih ke mode terang",
  light: "Beralih ke mode pink",
  pink: "Beralih ke mode gelap",
};

const themeIcons: Record<Theme, React.ReactNode> = {
  dark: <Moon className="h-5 w-5" />,
  light: <Sun className="h-5 w-5" />,
  pink: <Heart className="h-5 w-5" />,
};

const themeClasses: Record<Theme, string> = {
  dark: "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground",
  light: "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground",
  pink: "bg-pink-500/20 text-pink-400 hover:bg-pink-500 hover:text-white",
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "pink");
    if (theme === "light") {
      root.classList.add("light");
    } else if (theme === "pink") {
      root.classList.add("pink");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const cycle = () => {
    setTheme((t) => {
      const idx = themes.indexOf(t);
      return themes[(idx + 1) % themes.length];
    });
  };

  return (
    <button
      onClick={cycle}
      aria-label={themeLabels[theme]}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${themeClasses[theme]}`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.25 }}
        >
          {themeIcons[theme]}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}

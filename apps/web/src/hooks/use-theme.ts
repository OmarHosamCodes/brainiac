import { useCallback, useEffect, useState } from "react";

import { applyTheme, resolveInitialTheme, setTheme, type ThemePreference } from "@/lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => resolveInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const update = useCallback((next: ThemePreference) => {
    setTheme(next);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    update(theme === "dark" ? "light" : "dark");
  }, [theme, update]);

  return { theme, setTheme: update, toggle, isDark: theme === "dark" };
}

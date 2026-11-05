"use client";

import { useEffect, useState } from "react";

type ThemePref = "system" | "dark" | "light";

const STORAGE_KEY = "prism-theme";

function resolvedTheme(pref: ThemePref) {
  if (pref === "light" || pref === "dark") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(pref: ThemePref) {
  const theme = resolvedTheme(pref);
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-theme-pref", pref);
}

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next: ThemePref =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    setPref(next);
    applyTheme(next);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (window.localStorage.getItem(STORAGE_KEY) ||
        "system") as ThemePref;
      if (current === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const onChange = (value: ThemePref) => {
    setPref(value);
    window.localStorage.setItem(STORAGE_KEY, value);
    applyTheme(value);
  };

  return (
    <label className="admin-field-label" style={{ margin: 0 }}>
      <select
        className="admin-input theme-select"
        value={pref}
        onChange={(event) => onChange(event.target.value as ThemePref)}
        aria-label="Color theme"
      >
        <option value="system">System</option>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
    </label>
  );
}

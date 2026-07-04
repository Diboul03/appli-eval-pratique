import { useEffect, useState } from "react";

export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(() => localStorage.getItem("darkMode") === "1");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("darkMode", dark ? "1" : "0");
  }, [dark]);

  return [dark, () => setDark(d => !d)];
}

const themeToggleButton = document.querySelector("[data-theme-toggle]");

if (themeToggleButton) {
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggleButton.textContent = theme === "dark" ? "light mode" : "dark mode";
  };

  const storedTheme = localStorage.getItem("theme");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = storedTheme || (prefersDark ? "dark" : "light");

  applyTheme(initialTheme);

  themeToggleButton.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  });
}

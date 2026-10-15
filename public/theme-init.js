// Applies the saved light/dark choice before the app renders, so dark mode doesn't flash white first.
// Kept as a file (not an inline script) because the site's Content-Security-Policy only allows scripts from 'self'.
(function () {
  try {
    var saved = localStorage.getItem('app_theme');
    var dark = saved === 'dark' || (saved === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) { /* storage blocked: stay light */ }
})();

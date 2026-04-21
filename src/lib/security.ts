/**
 * Security utilities to deter unauthorized code inspection and copying.
 * Note: Client-side protection is a deterrent, not a absolute lock.
 * Real security is enforced on the server (Firestore Rules).
 */

export function initializeSecurityDeterrents() {
  if (typeof window === 'undefined') return;

  // 1. Disable Context Menu (Right Click)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, false);

  // 2. Disable Keyboard Shortcuts for DevTools and Source View
  document.addEventListener('keydown', (e) => {
    // Disable F12
    if (e.key === 'F12') {
      e.preventDefault();
    }
    
    // Disable Ctrl+Shift+I (Inspect)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
    }

    // Disable Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
    }

    // Disable Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
    }

    // Disable Ctrl+S (Save Page)
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
    }
  }, false);

  // 3. Clear console periodically (deterrent)
  const clearConsole = () => {
    if (process.env.NODE_ENV === 'production') {
      console.clear();
      console.log("%cSTOP!", "color: red; font-family: sans-serif; font-size: 4em; font-weight: bold; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;");
      console.log("%cThis area is for developers only. Unauthorized access is monitored.", "color: gray; font-family: sans-serif; font-size: 1.5em;");
    }
  };

  // Run on init and occasionally
  clearConsole();
  setInterval(clearConsole, 10000);
}

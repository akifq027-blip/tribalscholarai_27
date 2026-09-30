/**
 * TribalScholar AI - Theme Management
 * Persists the user's selected portal design (gov, tribal, or contrast)
 * using localStorage and applies the corresponding CSS class to document.body on page load.
 */

(function initTheme() {
  const THEME_STORAGE_KEY = 'tribalscholar_portal_theme';
  const VALID_THEMES = ['gov', 'tribal', 'contrast'];

  function applyTheme(themeName) {
    const safeTheme = VALID_THEMES.includes(themeName) ? themeName : 'gov';

    // Remove old theme classes
    document.body.classList.remove('theme-gov', 'theme-tribal', 'theme-contrast');

    // Add selected theme class
    document.body.classList.add(`theme-${safeTheme}`);

    // Persist to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }

    // Sync all selector elements matching .theme-preview-selector
    document.querySelectorAll('.theme-preview-selector').forEach((selectEl) => {
      if (selectEl.value !== safeTheme) {
        selectEl.value = safeTheme;
      }
    });
  }

  // Load saved theme or default to 'gov'
  let savedTheme = 'gov';
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'gov';
  } catch (e) {
    savedTheme = 'gov';
  }

  // Apply immediately when DOM is interactive or loaded
  if (document.body) {
    applyTheme(savedTheme);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(savedTheme);
    });
  }

  // Attach change event listener to any .theme-preview-selector in the DOM
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(savedTheme);

    // Event delegation on document to catch all .theme-preview-selector
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (target && target.matches('.theme-preview-selector')) {
        applyTheme(target.value);
      }
    });
  });

  // Expose helper globally
  window.TribalScholarTheme = {
    setTheme: applyTheme,
    getTheme: () => localStorage.getItem(THEME_STORAGE_KEY) || 'gov',
  };
})();

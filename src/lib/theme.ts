const THEME_KEY = 'hanzi-theme'

export type ThemePref = 'light' | 'dark'

export function getStoredTheme(): ThemePref | null {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'light' || v === 'dark' ? v : null
}

export function applyTheme(pref: ThemePref): void {
  document.documentElement.setAttribute('data-theme', pref)
}

export function setTheme(pref: ThemePref): void {
  localStorage.setItem(THEME_KEY, pref)
  applyTheme(pref)
}

// Dark mode is disabled for now — always force light, regardless of stored
// preference or OS setting.
export function initTheme(): void {
  applyTheme('light')
}

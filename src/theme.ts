import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

/*
 * Two art directions share the same site:
 *   papel — cream paper, serif, terra stars (the first version)
 *   noite — the palette of Colombia's own portfolio: night blue, cream, mustard
 * The default lives in index.html (DEFAULT_THEME). `?tema=papel|noite` forces one.
 */
export type Theme = 'papel' | 'noite'
export const themes: Theme[] = ['noite', 'papel']
export const themeLabels: Record<Theme, string> = { noite: 'Noite', papel: 'Papel' }

const storageKey = 'colombia.theme'
const themeColors: Record<Theme, string> = { papel: '#f1e5d1', noite: '#032741' }

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'papel' ? 'papel' : 'noite'
}

function subscribe(callback: () => void) {
  window.addEventListener('themechange', callback)
  return () => window.removeEventListener('themechange', callback)
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme)
}

export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  if (theme === getTheme()) return
  const root = document.documentElement

  const apply = () => {
    root.dataset.theme = theme
    try { localStorage.setItem(storageKey, theme) } catch { /* storage disabled */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme])
    flushSync(() => { window.dispatchEvent(new Event('themechange')) })
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduced) {
    apply()
    return
  }
  const x = origin?.x ?? innerWidth / 2
  const y = origin?.y ?? innerHeight / 2
  root.style.setProperty('--reveal-x', `${x}px`)
  root.style.setProperty('--reveal-y', `${y}px`)
  root.dataset.switching = 'theme'
  const transition = document.startViewTransition(apply)
  transition.finished.finally(() => { delete root.dataset.switching })
}

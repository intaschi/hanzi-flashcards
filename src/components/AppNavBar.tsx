import type { View } from '../app'

interface Props {
  activeView: View
  onNav: (view: View) => void
}

export function AppNavBar({ activeView, onNav }: Props) {
  return (
    <footer class="app-navbar">
      <nav class="navbar-nav">
        <button
          type="button"
          class={activeView === 'review-hanzi' ? 'active' : ''}
          onClick={() => onNav('review-hanzi')}
        >
          Hanzi
        </button>
        <button
          type="button"
          class={activeView === 'review-words' ? 'active' : ''}
          onClick={() => onNav('review-words')}
        >
          Words
        </button>
        <button
          type="button"
          class={activeView === 'browse' ? 'active' : ''}
          onClick={() => onNav('browse')}
        >
          Browse
        </button>
        <button
          type="button"
          class={activeView === 'settings' ? 'active' : ''}
          onClick={() => onNav('settings')}
        >
          Settings
        </button>
        <button
          type="button"
          class={activeView === 'about' ? 'active' : ''}
          onClick={() => onNav('about')}
        >
          About
        </button>
      </nav>
    </footer>
  )
}

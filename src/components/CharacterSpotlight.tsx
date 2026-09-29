interface Props {
  character: string
  pinyin: string
  class?: string
}

// A dark inset panel showing a character in an actual brush-calligraphy face —
// the one place in the app that leans fully into "ink on paper" rather than
// the clean sans/serif UI everywhere else. Used sparingly: landing hero + the
// end-of-session celebration, never the main review card (which needs the
// legible stroke-order box, not a stylized brush glyph).
export function CharacterSpotlight({ character, pinyin, class: className }: Props) {
  return (
    <div class={`spotlight ${className ?? ''}`}>
      <span class="spotlight-char">{character}</span>
      <span class="spotlight-pinyin">{pinyin}</span>
    </div>
  )
}

interface Props {
  characters: string[]
}

export function CharacterStrip({ characters }: Props) {
  if (characters.length === 0) return null

  return (
    <div class="char-strip-wrap">
      <div class="char-strip chinese">
        {characters.map((c, i) => (
          <span class={i === 0 ? 'on' : ''} key={i}>
            {c}
          </span>
        ))}
      </div>
      <div class="strip-dots">
        {characters.map((_, i) => (
          <span class={i === 0 ? 'on' : ''} key={i} />
        ))}
      </div>
    </div>
  )
}

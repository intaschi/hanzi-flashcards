interface Props {
  text: string
}

// Same "?" reveal-on-hover/focus pattern as the stat squares' .stat-help,
// generalized for use anywhere inline (a heading, a label) rather than only
// in the fixed corner of a square card.
export function HelpTip({ text }: Props) {
  return (
    <span class="help-tip" tabIndex={0} aria-label={text}>
      ?
      <span class="help-tip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  )
}

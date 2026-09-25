interface Props {
  class?: string
}

// A hand-shaped ink/red brush swipe — an actual painted stroke, not a thin rule.
// Intentionally imperfect edges (small notches) to read as brush, not vector-perfect.
export function BrushStroke({ class: className }: Props) {
  return (
    <svg
      class={className}
      viewBox="0 0 600 160"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M8,88 C40,55 90,28 160,32 C210,35 230,18 300,26 C370,34 410,12 470,22
           C510,29 545,20 588,42 C566,52 552,44 540,56 C560,64 578,58 590,70
           C555,86 505,66 470,78 C430,92 400,70 360,86 C320,102 280,80 240,96
           C195,114 150,98 108,116 C72,131 40,124 18,108 C6,100 2,96 8,88 Z"
        fill="currentColor"
      />
      <ellipse cx="520" cy="96" rx="7" ry="4" fill="currentColor" opacity="0.85" />
      <ellipse cx="540" cy="112" rx="4" ry="2.5" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

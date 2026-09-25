export type AudioKind = 'hanzi' | 'hanzi-example' | 'words' | 'words-example'

// Card ids ("U+4E2D", "W+xxxx-xxxx") are already filename- and URL-path-safe,
// so the file on disk and the fetch path share the id verbatim — no encoding
// step to keep in sync between the generator script and the app.
export function audioPath(kind: AudioKind, id: string): string {
  return `${import.meta.env.BASE_URL}audio/${kind}/${id}.m4a`
}

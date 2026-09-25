let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null

function getVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesReady) return voicesReady
  voicesReady = new Promise((resolve) => {
    const existing = speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }
    // getVoices() can return empty synchronously even when voices exist — they
    // load asynchronously and fire this event once ready.
    speechSynthesis.addEventListener(
      'voiceschanged',
      () => resolve(speechSynthesis.getVoices()),
      { once: true },
    )
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1000)
  })
  return voicesReady
}

export async function hasMandarinVoice(): Promise<boolean> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  const voices = await getVoices()
  return voices.some((v) => v.lang.toLowerCase().startsWith('zh'))
}

export function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  speechSynthesis.cancel()
  speechSynthesis.speak(utterance)
}

// Pre-generated clips (data/pipeline/scripts/05-generate-audio.ts) are far
// more consistent than the browser's own TTS, but not every card has one yet
// (later word batches land audio-less until the pipeline catches up) — a
// missing/unplayable file falls back to speak() rather than staying silent.
export function playAudio(src: string | undefined, fallbackText: string): void {
  if (!src) {
    speak(fallbackText)
    return
  }
  let fellBack = false
  const fallback = () => {
    if (fellBack) return
    fellBack = true
    speak(fallbackText)
  }
  const audio = new Audio(src)
  audio.addEventListener('error', fallback)
  audio.play().catch(fallback)
}

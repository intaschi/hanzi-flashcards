import { useRef, useState } from 'preact/hooks'
import { exportStateJson, mergeImportedState } from '../state/srs'
import type { SrsState } from '../state/types'

const LAST_EXPORTED_KEY = 'hanzi-srs.lastExportedAt'

interface Props {
  state: SrsState
  onImported: (newState: SrsState) => void
}

export function BackupPanel({ state, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const lastExportedAt = localStorage.getItem(LAST_EXPORTED_KEY)

  function handleExport() {
    const json = exportStateJson(state)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `hanzi-flashcards-progress-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    localStorage.setItem(LAST_EXPORTED_KEY, new Date().toISOString())
    setMessage('Exported. Keep this file somewhere safe (cloud drive, email to yourself, etc.).')
  }

  async function handleImportFile(file: File) {
    const text = await file.text()
    try {
      const imported = JSON.parse(text) as SrsState
      if (!imported.cards || typeof imported.cards !== 'object') {
        setMessage('That file does not look like a hanzi-flashcards progress export.')
        return
      }
      const { merged, summary } = mergeImportedState(state, imported)
      onImported(merged)
      setMessage(
        `Import complete — updated ${summary.updated} card(s), skipped ${summary.skipped} older record(s) already newer locally.`,
      )
    } catch {
      setMessage('Could not read that file — is it a valid exported progress JSON?')
    }
  }

  return (
    <div class="backup-panel">
      <h3>Backup & restore</h3>
      <p>
        Progress is saved automatically in this browser — export a backup occasionally as
        insurance, or to move it to another device.
      </p>

      <div class="backup-actions">
        <button type="button" onClick={handleExport}>
          Export progress (JSON)
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Import progress (JSON)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          class="hidden-file-input"
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) handleImportFile(file)
          }}
        />
      </div>

      <p class="backup-last-exported">
        {lastExportedAt
          ? `Last backup: ${new Date(lastExportedAt).toLocaleString()}`
          : "You haven't exported a backup yet."}
      </p>

      {message && <p class="backup-message">{message}</p>}
    </div>
  )
}

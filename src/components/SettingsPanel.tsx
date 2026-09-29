import { BackupPanel } from './BackupPanel'
import type { Settings, SrsState } from '../state/types'

interface DeckFieldsProps {
  settings: Settings
  onChange: (settings: Settings) => void
}

// The heading doubles as the field's label now that it's the only
// setting there is — a generic "Settings" title above a repeat of the
// same label was redundant with just one field left.
function DeckSettingsFields({ settings, onChange }: DeckFieldsProps) {
  function updateField(field: keyof Settings, raw: string) {
    const value = Number(raw)
    if (Number.isNaN(value)) return
    onChange({ ...settings, [field]: value })
  }

  return (
    <input
      type="number"
      min={1}
      max={100}
      class="settings-inline-input"
      value={settings.newCardsPerDay}
      onInput={(e) => updateField('newCardsPerDay', (e.target as HTMLInputElement).value)}
    />
  )
}

interface Props {
  wordsSettings: Settings
  onWordsChange: (settings: Settings) => void
  srsState: SrsState
  onImported: (newState: SrsState) => void
}

// No more tab switcher — Words was the only deck it ever needed to
// distinguish, and there's just one deck now. Settings and Backup are two
// separate cards rather than one panel with a divider, matching the
// stat-square treatment on the other sidebar.
export function SettingsPanel({ wordsSettings, onWordsChange, srsState, onImported }: Props) {
  return (
    <div class="settings-panel">
      <div class="settings-card">
        <div class="settings-card-head">
          <h2>New cards /day</h2>
          <DeckSettingsFields settings={wordsSettings} onChange={onWordsChange} />
        </div>
      </div>
      <div class="settings-card">
        <BackupPanel state={srsState} onImported={onImported} />
      </div>
    </div>
  )
}

import { BackupPanel } from './BackupPanel'
import type { Settings, SrsState } from '../state/types'

interface DeckFieldsProps {
  settings: Settings
  onChange: (settings: Settings) => void
}

function DeckSettingsFields({ settings, onChange }: DeckFieldsProps) {
  function updateField(field: keyof Settings, raw: string) {
    const value = Number(raw)
    if (Number.isNaN(value)) return
    onChange({ ...settings, [field]: value })
  }

  return (
    <div class="settings-deck-group">
      <label class="settings-field">
        New cards per day
        <input
          type="number"
          min={1}
          max={100}
          value={settings.newCardsPerDay}
          onInput={(e) => updateField('newCardsPerDay', (e.target as HTMLInputElement).value)}
        />
      </label>

      <label class="settings-field">
        Day rollover hour (0–23)
        <input
          type="number"
          min={0}
          max={23}
          value={settings.dayRolloverHour}
          onInput={(e) => updateField('dayRolloverHour', (e.target as HTMLInputElement).value)}
        />
      </label>
    </div>
  )
}

interface Props {
  wordsSettings: Settings
  onWordsChange: (settings: Settings) => void
  srsState: SrsState
  onImported: (newState: SrsState) => void
}

// No more tab switcher — Words was the only deck it ever needed to
// distinguish, and there's just one deck now. Both sections render at
// once instead, separated by a divider.
export function SettingsPanel({ wordsSettings, onWordsChange, srsState, onImported }: Props) {
  return (
    <div class="settings-panel">
      <h2>Settings</h2>
      <DeckSettingsFields settings={wordsSettings} onChange={onWordsChange} />
      <hr class="settings-divider" />
      <BackupPanel state={srsState} onImported={onImported} />
    </div>
  )
}

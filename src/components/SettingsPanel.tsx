import { BackupPanel } from './BackupPanel'
import type { Settings, SrsState } from '../state/types'

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
  srsState: SrsState
  onImported: (newState: SrsState) => void
}

export function SettingsPanel({ settings, onChange, srsState, onImported }: Props) {
  function updateField(field: keyof Settings, raw: string) {
    const value = Number(raw)
    if (Number.isNaN(value)) return
    onChange({ ...settings, [field]: value })
  }

  return (
    <div class="settings-panel">
      <h2>Settings</h2>

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
        <span class="settings-hint">
          Your study "day" ends at this local hour rather than literal midnight.
        </span>
      </label>

      <label class="settings-field">
        Max review interval (days)
        <input
          type="number"
          min={30}
          max={3650}
          value={settings.maxIntervalDays}
          onInput={(e) => updateField('maxIntervalDays', (e.target as HTMLInputElement).value)}
        />
      </label>

      <hr class="settings-divider" />

      <BackupPanel state={srsState} onImported={onImported} />
    </div>
  )
}

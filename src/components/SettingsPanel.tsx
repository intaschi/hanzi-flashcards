import { useState } from 'preact/hooks'
import { BackupPanel } from './BackupPanel'
import type { Settings, SrsState } from '../state/types'

type SettingsTab = 'hanzi' | 'words' | 'backup'

interface DeckFieldsProps {
  label: string
  settings: Settings
  onChange: (settings: Settings) => void
}

// Each deck (Hanzi, Words) keeps its own independent SrsState — including its
// own daily new-card cap — so this renders once per deck rather than once
// globally, the way the settings used to (silently) only ever affect Hanzi.
function DeckSettingsFields({ label, settings, onChange }: DeckFieldsProps) {
  function updateField(field: keyof Settings, raw: string) {
    const value = Number(raw)
    if (Number.isNaN(value)) return
    onChange({ ...settings, [field]: value })
  }

  return (
    <div class="settings-deck-group">
      <h3>{label}</h3>

      <label class="settings-field">
        New cards per day
        <input
          type="number"
          min={1}
          max={100}
          value={settings.newCardsPerDay}
          onInput={(e) => updateField('newCardsPerDay', (e.target as HTMLInputElement).value)}
        />
        <span class="settings-hint">
          Caps only how many brand-new cards get introduced per day. Every card already due
          for review is always included on top of this, so a day's full queue is usually
          larger than this number — this isn't a total daily card limit.
        </span>
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
    </div>
  )
}

interface Props {
  hanziSettings: Settings
  onHanziChange: (settings: Settings) => void
  wordsSettings: Settings
  onWordsChange: (settings: Settings) => void
  srsState: SrsState
  onImported: (newState: SrsState) => void
}

export function SettingsPanel({
  hanziSettings,
  onHanziChange,
  wordsSettings,
  onWordsChange,
  srsState,
  onImported,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('hanzi')

  return (
    <div class="settings-panel">
      <h2>Settings</h2>

      <div class="card-tabs" role="tablist">
        {(['hanzi', 'words', 'backup'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            class={`card-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'hanzi' ? 'Hanzi' : tab === 'words' ? 'Words' : 'Backup'}
          </button>
        ))}
      </div>

      {activeTab === 'hanzi' && (
        <DeckSettingsFields label="Hanzi" settings={hanziSettings} onChange={onHanziChange} />
      )}
      {activeTab === 'words' && (
        <DeckSettingsFields label="Words" settings={wordsSettings} onChange={onWordsChange} />
      )}
      {activeTab === 'backup' && <BackupPanel state={srsState} onImported={onImported} />}
    </div>
  )
}

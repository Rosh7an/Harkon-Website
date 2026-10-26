'use client'

import { useRef, useState } from 'react'
import styles from './SolutionDiscovery.module.css'

// Saved answers use the same option-first, ". " separator as the live composer.
// Only consume exact leading options; never remove matches from inside prose.
export function splitSavedAnswer(value: unknown, options: readonly string[]) {
  let details = typeof value === 'string' ? value : ''
  const selected: string[] = []
  while (details) {
    const option = options.find(item => !selected.includes(item) && (details === item || details.startsWith(`${item}. `)))
    if (!option) break
    selected.push(option)
    details = details === option ? '' : details.slice(option.length + 2)
  }
  return { selected, details }
}

export default function SavedAnswerEditor({ id, value, options, disabled, onChange }: {
  id: string
  value: string
  options: readonly string[]
  disabled: boolean
  onChange: (value: string) => void
}) {
  // The parent keys this editor by question and revision to reset on navigation.
  const [draft, setDraft] = useState(() => splitSavedAnswer(value, options))
  const region = useRef<HTMLDivElement>(null)
  function update(selected: string[], details = draft.details) {
    setDraft({ selected, details })
    onChange([...selected, details.trim()].filter(Boolean).join('. '))
  }
  function remove(option: string) {
    update(draft.selected.filter(item => item !== option))
    requestAnimationFrame(() => {
      const returned = Array.from(region.current?.querySelectorAll<HTMLButtonElement>('[data-answer-suggestion]') ?? []).find(button => button.dataset.answerSuggestion === option)
      returned?.focus({ preventScroll: true })
    })
  }
  const exclusive = 'No existing systems or special requirements'
  const length = [...draft.selected, draft.details.trim()].filter(Boolean).join('. ').length
  return <div ref={region} className="space-y-3">
    <div className={styles.answerComposer}>
      {draft.selected.length > 0 && <div className={styles.answerChips} aria-label="Selected answers">{draft.selected.map(option => <span className={styles.answerChip} key={option}><span>{option}</span><button type="button" disabled={disabled} aria-label={`Remove ${option}`} onClick={() => remove(option)}>×</button></span>)}</div>}
      <textarea id={id} className={styles.composerInput} rows={4} maxLength={2000} value={draft.details} disabled={disabled} onChange={event => update(draft.selected, event.target.value)} aria-describedby={`${id}-limit`} />
    </div>
    {options.some(option => !draft.selected.includes(option)) && <div className={styles.answerSuggestions}><p>Suggestions — choose as many as apply</p><div>{options.filter(option => !draft.selected.includes(option)).map(option => <button key={option} type="button" className={`${styles.secondary} min-h-11 px-4 py-2 rounded-xl border border-[var(--border-hi)] text-[var(--text)] disabled:opacity-50`} data-answer-suggestion={option} aria-pressed="false" disabled={disabled} onClick={() => update(option === exclusive ? [option] : [...draft.selected.filter(item => item !== exclusive), option])}>{option}</button>)}</div></div>}
    <p id={`${id}-limit`} className={length > 1600 ? `text-xs ${length > 2000 ? 'text-[var(--error)]' : 'text-[var(--muted)]'}` : 'sr-only'}>{length.toLocaleString('en-IN')} of 2,000 characters including selected answers.</p>
  </div>
}

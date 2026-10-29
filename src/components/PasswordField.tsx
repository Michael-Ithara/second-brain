import { useState } from 'react'
import { fieldClass } from '../lib/auth'

interface Props {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  hint?: string
  invalid?: boolean
  describedBy?: string
  minLength?: number
}

export function PasswordField({ id, label, value, onChange, autoComplete, hint, invalid, describedBy, minLength }: Props) {
  const [visible, setVisible] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  const describedByIds = [hintId, describedBy].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-2 mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-invalid={invalid || undefined}
          aria-describedby={describedByIds}
          className={`${fieldClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label="Show password"
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-ink hover:bg-tint"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {visible ? (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
      {hint && <p id={hintId} className="text-xs text-ink-3 mt-1.5">{hint}</p>}
    </div>
  )
}

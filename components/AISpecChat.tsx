'use client'

import { useState, useRef, useEffect } from 'react'

interface ActionWhatsApp {
  type: 'whatsapp'
  message: string
}

interface Message {
  role: 'user' | 'model'
  text: string
  options?: string[]        // Single-select chips
  multiOptions?: string[]   // Multi-select toggleable chips
  milestone?: number        // Current scoping milestone (1-4)
  whatsappConsult?: ActionWhatsApp // When AI prescribes a WhatsApp consultation
}

interface Props {
  projectContext: string
  onSpecsUpdate: (specs: string) => void
  onFeatureSync?: (featureIds: string[]) => void
  onProceed?: () => void
  onClose?: () => void
}

function MessageText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => (
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <span key={index}>{part}</span>
  ))}</>
}

export interface ParsedResponse {
  displayText: string
  options: string[]
  multiOptions: string[]
  syncFeatures: string[] | null
  milestone: number | null
  specSummary: string | null
  action: 'proceed' | ActionWhatsApp | null
}

/** Safely extracts string arrays from tag format like TAG:["a", "b"] or TAG:['a', 'b'] */
function parseArrayTag(text: string, tag: string): string[] {
  const regex = new RegExp(`${tag}:\\s*\\[([\\s\\S]*?)\\]`, 'i')
  const match = text.match(regex)
  if (!match) return []

  const inner = match[1].trim()
  if (!inner) return []

  // Try standard JSON.parse
  try {
    const parsed = JSON.parse(`[${inner}]`) as unknown[]
    return parsed.map(item => {
      if (typeof item === 'string') return item.trim()
      if (typeof item === 'object' && item !== null) {
        const vals = Object.values(item)
        return vals.length > 0 ? String(vals[0]).trim() : JSON.stringify(item)
      }
      return String(item).trim()
    }).filter(Boolean)
  } catch {
    // Fallback regex matching double or single quoted strings
    const strRegex = /["']([^"'\\]*(?:\\.[^"'\\]*)*)["']/g
    const items: string[] = []
    let m: RegExpExecArray | null
    while ((m = strRegex.exec(inner)) !== null) {
      if (m[1].trim()) items.push(m[1].trim())
    }
    if (items.length > 0) return items

    // Final fallback: split by comma
    return inner.split(',').map(s => s.replace(/^["']|["']$/g, '').trim()).filter(Boolean)
  }
}

/** Parse raw AI text → { displayText, options, multiOptions, syncFeatures, milestone, specSummary } */
export function parseResponse(raw: string): ParsedResponse {
  let workingText = raw.trim()
  let options: string[] = []
  let multiOptions: string[] = []
  let syncFeatures: string[] | null = null
  let milestone: number | null = null
  let specSummary: string | null = null
  let action: 'proceed' | ActionWhatsApp | null = null

  if (/ACTION:PROCEED/i.test(workingText)) {
    action = 'proceed'
    workingText = workingText.replace(/ACTION:PROCEED/gi, '').trim()
  }

  const whatsappMatch = workingText.match(/ACTION:WHATSAPP:\[([\s\S]*?)\]/i)
  if (whatsappMatch) {
    action = { type: 'whatsapp', message: whatsappMatch[1].trim() }
    workingText = workingText.replace(whatsappMatch[0], '').trim()
  }

  const milestoneMatch = workingText.match(/MILESTONE:([1-4])/i)
  if (milestoneMatch) {
    milestone = parseInt(milestoneMatch[1], 10)
  }

  multiOptions = parseArrayTag(workingText, 'MULTI_OPTIONS')
  options = parseArrayTag(workingText, 'OPTIONS')
  if (/SYNC_FEATURES:\s*\[/i.test(workingText)) syncFeatures = parseArrayTag(workingText, 'SYNC_FEATURES')

  const cleanTags = (text: string) => text
    .replace(/MULTI_OPTIONS:\s*\[[\s\S]*?\]/gi, '')
    .replace(/OPTIONS:\s*\[[\s\S]*?\]/gi, '')
    .replace(/SYNC_FEATURES:\s*\[[\s\S]*?\]/gi, '')
    .replace(/MILESTONE:[1-4]/gi, '')
    .trim()

  const summaryMatch = workingText.match(/SPEC_SUMMARY:/i)
  let displayText = ''
  if (summaryMatch?.index !== undefined) {
    displayText = cleanTags(workingText.slice(0, summaryMatch.index))
    specSummary = cleanTags(workingText.slice(summaryMatch.index + summaryMatch[0].length))
  } else {
    displayText = cleanTags(workingText)
  }

  // Removed fallback chips to force text input or explicit AI options

  // Defensive Safeguard: If the LLM accidentally outputs both, MULTI_OPTIONS takes strict precedence.
  if (multiOptions.length > 0) {
    options = []
  }

  return { displayText, options, multiOptions, syncFeatures, milestone, specSummary, action }
}

export default function AISpecChat({ projectContext, onSpecsUpdate, onFeatureSync, onProceed, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentMilestone, setCurrentMilestone] = useState<number>(1)
  const [selectedMulti, setSelectedMulti] = useState<string[]>([])
  const [cooldown, setCooldown] = useState<number>(0)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const whatsappPhone = (process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '').replace(/\D/g, '')

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Scroll within chat container only — never scrolls the page
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [messages, loading, selectedMulti])

  // Focus input on load
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Auto-resize textarea when input changes
  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = 'auto' // Reset height to recalculate
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [input])

  const callGroq = async (history: { role: 'user' | 'assistant', content: string }[]) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history }),
    })
    
    const data = await response.json()
    if (!response.ok) {
      const error = new Error(data.error || 'Failed to fetch AI response') as Error & { status?: number }
      error.status = response.status
      throw error
    }

    return data.result
  }

  const processAndAppend = (raw: string) => {
    const parsed = parseResponse(raw)

    if (parsed.milestone) {
      setCurrentMilestone(parsed.milestone)
    }

    if (parsed.syncFeatures !== null && onFeatureSync) {
      onFeatureSync(parsed.syncFeatures)
    }

    if (parsed.specSummary) {
      const summaryText = parsed.specSummary
      onSpecsUpdate(summaryText)
      setMessages(prev => [...prev, {
        role: 'model',
        text: parsed.displayText ? `${parsed.displayText}\n\n${summaryText}` : summaryText,
        options: parsed.options,
        multiOptions: parsed.multiOptions,
        milestone: parsed.milestone || currentMilestone,
        whatsappConsult: typeof parsed.action === 'object' && parsed.action?.type === 'whatsapp' ? parsed.action : undefined,
      }])
    } else {
      setMessages(prev => [...prev, {
        role: 'model',
        text: parsed.displayText || '',
        options: parsed.options,
        multiOptions: parsed.multiOptions,
        milestone: parsed.milestone || currentMilestone,
        whatsappConsult: typeof parsed.action === 'object' && parsed.action?.type === 'whatsapp' ? parsed.action : undefined,
      }])
    }

    if (parsed.action === 'proceed' && onProceed) {
      setTimeout(onProceed, 1200) // Small delay so they can read the final message before jump
    }
  }

  const hasOpened = useRef(false)

  useEffect(() => {
    if (!hasOpened.current) {
      hasOpened.current = true
      openChat()
    }
  }, [])

  const openChat = async () => {
    if (messages.length > 0) return

    setLoading(true)
    try {
      const opener = `The client's current estimator selections: ${projectContext}. Acknowledge their choices in 1 warm, enthusiastic sentence, state your role as Exter Cloud Senior Architect, and ask: "To ensure I provide the right depth of recommendations, how would you like to proceed?" Output OPTIONS:["Non-Technical Person (Business & Product Focus)", "Technical Person (Engineering Focus)"] and MILESTONE:1.`
      const history: { role: 'user' | 'assistant', content: string }[] = [{ role: 'user', content: opener }]
      const responseText = await callGroq(history)
      processAndAppend(responseText)
    } catch (error: unknown) {
      const err = error as Error & { status?: number }
      const is429 = err.status === 429 || String(err).includes('429')
      if (is429) {
        setCooldown(30)
        setMessages([{
          role: 'model',
          text: "Rate limit reached (429). Please wait for 30 seconds before proceeding.",
          options: ["Non-Technical Founder (Business & Product Focus)", "Technical Lead / CTO (Engineering Focus)"],
        }])
      } else {
        setMessages([{
          role: 'model',
          text: "Hi! I'm your Senior Architect at Exter Cloud. I see your estimator selections! I'm here to advise you, suggest best-practice features, and build a complete project blueprint. How would you like to proceed?",
          options: ["Non-Technical Founder (Business & Product Focus)", "Technical Lead / CTO (Engineering Focus)"],
        }])
      }
    } finally {
      setLoading(false)
    }
  }

  const sendText = async (text: string) => {
    if (!text.trim() || loading) return

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setSelectedMulti([])
    setLoading(true)

    try {
      // Rebuild history from current UI messages
      const history: { role: 'user' | 'assistant', content: string }[] = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text
      }))

      const promptWithLiveContext = `[LIVE ESTIMATOR SELECTIONS: ${projectContext}]\nUser Response: ${text}`
      history.push({ role: 'user', content: promptWithLiveContext })

      const responseText = await callGroq(history)
      processAndAppend(responseText)
    } catch (error: unknown) {
      const err = error as Error & { status?: number }
      const is429 = err.status === 429 || String(err).includes('429')
      if (is429) {
        setCooldown(30)
        setMessages(prev => [...prev, {
          role: 'model',
          text: "Rate limit reached (429). Please wait for 30 seconds before proceeding.",
          options: [text], // Provide their text as an option to easily resend
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'model',
          text: "Connection reset briefly. Click your choice again to proceed with your blueprint!",
          options: [text, "SaaS Subscription Model", "One-Time Purchase", "Custom API Integrations"],
        }])
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleMultiSelect = (opt: string) => {
    setSelectedMulti(prev =>
      prev.includes(opt) ? prev.filter(item => item !== opt) : [...prev, opt]
    )
  }

  const confirmMultiSelect = () => {
    if (selectedMulti.length === 0 && !input.trim()) return
    let combinedText = ''
    if (selectedMulti.length > 0) {
      combinedText = `Selected options: ${selectedMulti.join(', ')}`
      if (input.trim()) combinedText += `. Additional notes: ${input.trim()}`
    } else {
      combinedText = input.trim()
    }
    sendText(combinedText)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (selectedMulti.length > 0) {
        confirmMultiSelect()
      } else {
        sendText(input)
      }
    }
  }

  const AiAvatar = () => (
    <span className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
      <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )

  const TypingDots = () => (
    <div className="flex gap-1 items-center h-7 px-1">
      {[0, 150, 300].map(delay => (
        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </div>
  )

  return (
    <div className="mt-0 h-full flex flex-col">
      <div className="rounded-2xl border border-[var(--border-hi)] bg-[var(--panel)] overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[500px]">

        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--accent)]/15">
                <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">Senior Technical Architect</p>
                <p className="text-[10px] text-[var(--accent)] font-mono">Exter Cloud Intelligence Engine</p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-lg leading-none cursor-pointer p-1"
                aria-label="Close chat"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          aria-live="polite"
          aria-label="AI architect conversation"
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Initial loading state */}
          {messages.length === 0 && loading && (
            <div className="flex items-start gap-2.5">
              <AiAvatar />
              <TypingDots />
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {/* Bubble row */}
              <div className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                {msg.role === 'model' ? (
                  <AiAvatar />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-[var(--on-accent)]">
                    U
                  </span>
                )}

                {/* Bubble */}
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] rounded-tr-sm font-medium'
                  : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-tl-sm shadow-sm'
                  }`}>
                  <MessageText text={msg.text} />
                </div>
              </div>

              {msg.role === 'model' && msg.whatsappConsult && i === messages.length - 1 && (
                <div className="mt-3 ml-8">
                  <a
                    href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(msg.whatsappConsult.message)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#25D366] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]"
                  >
                    Open WhatsApp consultation
                  </a>
                </div>
              )}

              {/* Single-select quick-reply chips */}
              {msg.role === 'model' && msg.options && msg.options.length > 0 && i === messages.length - 1 && !loading && (
                <div className="flex flex-wrap gap-2 mt-2.5 ml-8">
                  {msg.options.map((opt, oi) => (
                    <button
                      key={oi}
                      type="button"
                      disabled={cooldown > 0}
                      onClick={() => sendText(opt)}
                      className={`min-h-11 px-3 py-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/8 text-[var(--accent)] text-[11px] font-medium transition-all ${cooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--accent)]/20 hover:border-[var(--accent)] cursor-pointer'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Multi-select toggleable checkbox chips */}
              {msg.role === 'model' && msg.multiOptions && msg.multiOptions.length > 0 && i === messages.length - 1 && !loading && (
                <div className="mt-3 ml-8 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
                  <p className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-wider">Select all that apply:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.multiOptions.map((opt, oi) => {
                      const isSelected = selectedMulti.includes(opt)
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={cooldown > 0}
                          onClick={() => toggleMultiSelect(opt)}
                          aria-pressed={isSelected}
                          className={`flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-medium transition-all ${cooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isSelected
                            ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-md'
                            : 'bg-[var(--panel)] text-[var(--text)] border-[var(--border-hi)] hover:border-[var(--accent)]/60'
                            }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${isSelected ? 'bg-white text-[var(--accent)]' : 'border border-[var(--border-hi)] bg-[var(--surface)]'
                            }`}>
                            {isSelected ? '✓' : ''}
                          </span>
                          <span>{opt}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && messages.length > 0 && (
            <div className="flex items-start gap-2.5">
              <AiAvatar />
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl rounded-tl-sm px-3 py-2">
                <TypingDots />
              </div>
            </div>
          )}
        </div>

        {/* Action bar for multi-select submission */}
        {selectedMulti.length > 0 && (
          <div className="px-4 py-2 bg-[var(--accent)]/10 border-t border-[var(--accent)]/30 flex items-center justify-between">
            <span className="text-xs text-[var(--accent)] font-medium">
              {selectedMulti.length} option{selectedMulti.length > 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={confirmMultiSelect}
              className={`min-h-11 px-3.5 py-2 rounded-lg bg-[var(--accent)] text-[var(--on-accent)] text-xs font-semibold shadow-md transition-all ${cooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--accent)]/90 cursor-pointer'}`}
            >
              Confirm Selections →
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="px-3 py-3 border-t border-[var(--border)] flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading || cooldown > 0}
            placeholder={cooldown > 0 ? `Please wait ${cooldown}s...` : selectedMulti.length > 0 ? "Add optional custom notes & press enter..." : "Type your specs or select options above..."}
            className="flex-1 bg-[var(--surface)] border border-[var(--border-hi)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--muted2)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all disabled:opacity-50 resize-none overflow-y-auto"
            style={{ minHeight: '38px', maxHeight: '120px' }}
            rows={1}
          />
          <button
            type="button"
            onClick={selectedMulti.length > 0 ? confirmMultiSelect : () => sendText(input)}
            disabled={loading || cooldown > 0 || (!input.trim() && selectedMulti.length === 0)}
            className="flex items-center justify-center w-11 h-11 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--on-accent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
            aria-label="Send"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  )
}

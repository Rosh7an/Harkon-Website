import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { SYSTEM_PROMPT_AI } from '@/app/constant'

// Prefer the server-only name. The legacy value is read only in this server route so
// existing deployments keep working while their environment configuration is migrated.
const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function parseHistory(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 24) return null
  const messages: ChatMessage[] = []
  let totalCharacters = 0
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const { role, content } = item as { role?: unknown; content?: unknown }
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || content.length === 0 || content.length > 5000) return null
    totalCharacters += content.length
    if (totalCharacters > 30000) return null
    messages.push({ role, content })
  }
  return messages
}

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      throw new Error('No Groq API Key')
    }
    
    const body = await req.json() as { history?: unknown }
    const history = parseHistory(body.history)
    if (!history) return NextResponse.json({ error: 'Invalid chat history.' }, { status: 400 })

    const groq = new Groq({ apiKey })
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_AI },
        ...history,
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
    })

    return NextResponse.json({ result: chatCompletion.choices[0]?.message?.content || '' })
  } catch (error: unknown) {
    console.error('Chat API Error:', error)
    const errStatus = error && typeof error === 'object' && 'status' in error ? (error as { status?: number }).status : 500
    const status = errStatus === 429 ? 429 : error instanceof SyntaxError ? 400 : 500
    return NextResponse.json(
      { error: status === 429 ? 'AI request limit reached. Please wait and try again.' : status === 400 ? 'Invalid request body.' : 'Failed to fetch AI response.' },
      { status }
    )
  }
}

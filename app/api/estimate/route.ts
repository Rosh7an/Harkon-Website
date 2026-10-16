import { NextResponse } from 'next/server'
import { EstimateValidationError, estimateFromRequest, parseEstimateRequest } from '@/utils/estimateRequest'

export async function POST(req: Request) {
  try {
    const request = parseEstimateRequest(await req.json())
    const result = estimateFromRequest(request)
    return NextResponse.json({ result })
  } catch (error: unknown) {
    if (error instanceof EstimateValidationError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: error instanceof EstimateValidationError ? error.message : 'Invalid JSON request body.' },
        { status: 400 },
      )
    }
    console.error('Estimate API Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate estimate.' },
      { status: 500 }
    )
  }
}

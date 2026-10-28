import { QUESTIONS, boundedText, createDiscovery, customerAnswers, editFact, nextQuestion, recordAnswer, type DiscoverySession, type FactId } from './discovery'
import { isRecord } from './solutionCatalog'

export type RequirementAnswers = Partial<Record<FactId, string>>

export function parseRequirementAnswers(value: unknown, complete = false): RequirementAnswers {
  if (!isRecord(value) || Object.keys(value).some(key => !QUESTIONS.some(question => question.id === key))) throw new Error('Invalid requirement answers.')
  const answers: RequirementAnswers = {}
  for (const question of QUESTIONS) {
    if (Object.hasOwn(value, question.id)) answers[question.id] = boundedText(value[question.id])
    else if (complete) throw new Error('Answer all seven questions before AI review. You can say you are not sure.')
  }
  return answers
}

// Local answers never replace the sealed server revision or produce an estimate.
export function restoreRequirementAnswers(session: DiscoverySession, answers: RequirementAnswers): DiscoverySession {
  let updated = session
  for (const question of QUESTIONS) {
    const answer = answers[question.id]
    if (!answer) continue
    if (updated.facts[question.id]) updated = editFact(updated, question.id, answer)
    else if (nextQuestion(updated)?.id === question.id) updated = recordAnswer(updated, answer)
    else throw new Error('Saved answers are out of order.')
  }
  return { ...updated, revision: session.revision }
}

export function prepareBatchReview(session: DiscoverySession, value: unknown): DiscoverySession {
  const answers = parseRequirementAnswers(value, true)
  let updated = { ...createDiscovery('guided'), expiresAt: session.expiresAt }
  for (const question of QUESTIONS) updated = recordAnswer(updated, answers[question.id])
  return { ...updated, revision: session.revision + 1, reviewMode: 'batch' }
}

// Old AI turns may have inferred extra facts. Resume only the customer's actual
// saved answers so inferred fields cannot skip required batch questions.
export function migrateBatchCollection(session: DiscoverySession): DiscoverySession {
  const answers = customerAnswers(session)
  let updated = { ...createDiscovery('guided'), expiresAt: session.expiresAt }
  for (const [field, answer] of answers) updated = editFact(updated, field, answer)
  return { ...updated, revision: session.revision, turns: answers.size, reviewMode: 'batch' }
}

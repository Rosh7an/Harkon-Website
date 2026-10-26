import type { DiscoverySession } from '@/utils/discovery'
import type { CSSProperties } from 'react'
import { discoveryProgress, type ProgressInput } from '@/utils/discoveryProgress'
import styles from './SolutionDiscovery.module.css'

export default function DiscoveryProgress({ session, onReviewRequirements, onContinuePlanning, ...input }: { session: DiscoverySession | null; onReviewRequirements?: () => void; onContinuePlanning?: () => void } & ProgressInput) {
  const progress = discoveryProgress(session, input)
  return <div className={`${styles.glass} ${styles.progressPanel} ${styles.progressCompact}`}>
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="text-sm font-semibold">Section {progress.step} of 3</p>
      <p className={styles.progressValue}>{progress.percent}%</p>
    </div>
    <p className="sr-only" role="status" aria-live="polite">{session ? `${session.mode === 'manual' ? 'Manual plan' : 'Guided discovery'}: ${progress.percent}% complete. ${progress.detail}` : progress.detail}</p>
    <div className={styles.progressTrack} role="progressbar" aria-label={session?.mode === 'manual' ? 'Manual plan progress' : 'Guided discovery progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={`${progress.percent}% complete. ${progress.completedSteps} of ${progress.totalSteps} steps completed. ${progress.detail}`}>
      <div className={styles.progressFill} style={{ '--progress-ratio': progress.completedSteps / progress.totalSteps } as CSSProperties} />
    </div>
    <ol className={styles.steps} data-guided={session?.mode !== 'manual'} aria-label="Steps to your estimate">
      {progress.milestones.map(milestone => <li key={milestone.label} className={`${styles.step} ${milestone.completed ? styles.completedStep : ''} ${milestone.active ? styles.currentStep : ''}`} aria-current={milestone.active ? 'step' : undefined}>
        {milestone.label === 'Requirements' && onReviewRequirements
          ? <button type="button" className={styles.stepLink} aria-label="Review requirements" onClick={onReviewRequirements}>{milestone.label}</button>
          : milestone.label === 'Your solution' && onContinuePlanning
            ? <button type="button" className={styles.stepLink} aria-label="Continue planning" onClick={onContinuePlanning}>{milestone.label}</button>
            : <span>{milestone.label}</span>}
        <span className="sr-only"> at {milestone.percent}%{milestone.completed ? ' — completed' : milestone.active ? ' — current' : ' — upcoming'}</span>
      </li>)}
    </ol>
  </div>
}

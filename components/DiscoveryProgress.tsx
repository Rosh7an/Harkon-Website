import type { DiscoverySession } from '@/utils/discovery'
import type { CSSProperties } from 'react'
import { discoveryProgress, type ProgressInput } from '@/utils/discoveryProgress'
import styles from './SolutionDiscovery.module.css'

export default function DiscoveryProgress({ session, ...input }: { session: DiscoverySession | null } & ProgressInput) {
  const progress = discoveryProgress(session, input)
  return <div className={`${styles.glass} ${styles.progressPanel} ${styles.progressCompact}`}>
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="text-sm font-semibold">Section {progress.step} of 3</p>
      <p className={styles.progressValue}>{progress.percent}%</p>
    </div>
    <p className="sr-only" role="status" aria-live="polite">{session ? `${session.mode === 'manual' ? 'Manual plan' : 'Guided discovery'}: ${progress.percent}% complete. ${progress.detail}` : progress.detail}</p>
    <div className={styles.progressTrack} role="progressbar" aria-label={session?.mode === 'manual' ? 'Manual plan progress' : 'Guided discovery progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={`${progress.percent}% complete. ${progress.completedSteps} of ${progress.totalSteps} steps completed. ${progress.detail}`}>
      <div className={styles.progressFill} style={{ '--progress-ratio': progress.completedSteps / progress.totalSteps } as CSSProperties} />
      {progress.milestones.map((milestone, index) => <span key={milestone.label} className={`${styles.progressMarker} ${milestone.completed ? styles.completedMarker : ''}`} style={{ left: `${milestone.position}%` }} aria-hidden="true">{milestone.completed ? '✓' : index + 1}</span>)}
    </div>
    <ol className={styles.steps} data-guided={session?.mode !== 'manual'} aria-label="Steps to your estimate">
      {progress.milestones.map(milestone => <li key={milestone.label} style={{ left: `${milestone.position}%` }} className={`${styles.step} ${milestone.completed ? styles.completedStep : ''} ${milestone.active ? styles.currentStep : ''}`} aria-current={milestone.active ? 'step' : undefined}>
        <span>{milestone.label}<span className="sr-only"> at {milestone.percent}%{milestone.completed ? ' — completed' : milestone.active ? ' — current' : ' — upcoming'}</span></span>
      </li>)}
    </ol>
  </div>
}

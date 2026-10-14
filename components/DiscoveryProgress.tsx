import type { DiscoverySession } from '@/utils/discovery'
import { discoveryProgress, type ProgressInput } from '@/utils/discoveryProgress'
import styles from './SolutionDiscovery.module.css'

export default function DiscoveryProgress({ session, ...input }: { session: DiscoverySession | null } & ProgressInput) {
  const progress = discoveryProgress(session, input)
  const labels = [session?.mode === 'manual' ? 'Build your plan' : 'Tell us about it', 'Review your plan', 'See your estimate']
  return <div className={`${styles.glass} ${styles.progressPanel}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <p className="font-semibold">{session?.mode === 'manual' ? 'Build my own plan' : session ? 'Guided discovery' : 'Your plan'} <span className="sr-only">{session ? `Step ${progress.step} of 3` : 'Three simple steps'}</span></p>
      <p className={styles.progressValue}>{progress.percent}%</p>
    </div>
    <p className="sr-only" role="status" aria-live="polite">{session ? `${session.mode === 'manual' ? 'Manual plan' : 'Guided discovery'}: ${progress.percent}% complete. ${progress.detail}` : progress.detail}</p>
    <div className="mb-3">
      <p className="text-sm text-[var(--muted)]">{progress.detail}</p>
    </div>
    <div className={styles.progressTrack} role="progressbar" aria-label={session?.mode === 'manual' ? 'Manual plan progress' : 'Guided discovery progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={`${progress.percent}% complete. Step ${progress.step} of 3. ${progress.detail}`}>
      <div className={styles.progressFill} style={{ transform: `scaleX(${progress.percent / 100})` }} />
    </div>
    <ol className={styles.steps} aria-label="Steps to your estimate">
      {labels.map((label, index) => <li key={index} className={`${styles.step} ${session && progress.step === index + 1 ? styles.currentStep : ''}`} aria-current={session && progress.step === index + 1 ? 'step' : undefined}>
        <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span><span>{label}</span>
      </li>)}
    </ol>
  </div>
}

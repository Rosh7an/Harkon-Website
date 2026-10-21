import type { DiscoverySession } from '@/utils/discovery'
import { discoveryProgress, type ProgressInput } from '@/utils/discoveryProgress'
import styles from './SolutionDiscovery.module.css'

export default function DiscoveryProgress({ session, ...input }: { session: DiscoverySession | null } & ProgressInput) {
  const progress = discoveryProgress(session, input)
  return <div className={`${styles.glass} ${styles.progressPanel} ${styles.progressCompact}`}>
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="text-sm font-semibold">Step {progress.step} of 3</p>
      <p className={styles.progressValue}>{progress.percent}%</p>
    </div>
    <p className="sr-only" role="status" aria-live="polite">{session ? `${session.mode === 'manual' ? 'Manual plan' : 'Guided discovery'}: ${progress.percent}% complete. ${progress.detail}` : progress.detail}</p>
    <div className={styles.progressTrack} role="progressbar" aria-label={session?.mode === 'manual' ? 'Manual plan progress' : 'Guided discovery progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={`${progress.percent}% complete. Step ${progress.step} of 3. ${progress.detail}`}>
      <div className={styles.progressFill} style={{ transform: `scaleX(${progress.percent / 100})` }} />
    </div>
  </div>
}

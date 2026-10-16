import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] relative overflow-hidden">
      
      {/* Background glow for aesthetics */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 flex flex-col items-center justify-center text-center px-4">
        <div className="mb-10 relative">
          <Image
            src="/logo-lockup-ondark.png"
            alt="Exter Cloud"
            width={400}
            height={265}
            priority
            className="show-on-dark w-48 sm:w-64 h-auto opacity-70"
          />
          <Image
            src="/logo-lockup-onlight.png"
            alt="Exter Cloud"
            width={400}
            height={265}
            priority
            className="show-on-light w-48 sm:w-64 h-auto opacity-70"
          />
        </div>

        <h1 className="text-7xl sm:text-9xl font-extrabold tracking-tighter mb-4 text-[var(--text)] drop-shadow-sm font-mono">
          404
        </h1>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6 text-[var(--muted)]">
          Lost in the cloud.
        </h2>
        
        <p className="text-sm sm:text-base text-[var(--muted2)] mb-10 max-w-[420px] mx-auto leading-relaxed">
          The node you are looking for has been deprecated, drifted away, or simply doesn't exist. Let's redirect your request.
        </p>

        <Link 
          href="/" 
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-sm transition-all transform hover:scale-[1.03] shadow-[0_0_30px_-5px_var(--accent)] hover:shadow-[0_0_40px_-5px_var(--accent)] cursor-pointer"
        >
          <span>Initialize Reboot (Return Home)</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

const BAR_HEIGHTS = [45, 62, 38, 80, 55, 90, 70]

const SIDEBAR_ITEMS = [
  { label: '📊 Dashboard', active: true },
  { label: '📅 Bookings', active: false },
  { label: '👥 Clients', active: false },
  { label: '📦 Orders', active: false },
  { label: '💬 WhatsApp', active: false },
  { label: '⚙️ Settings', active: false },
]

const STATS = [
  { val: '↑ 2,840', label: 'Bookings this month' },
  { val: '₹ 4.2L', label: 'Revenue generated' },
  { val: '98%', label: 'Client satisfaction' },
]

export default function DashboardMockup() {
  return (
    <div className="flex justify-center px-6 md:px-12 lg:px-16 pb-24">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 overflow-hidden shadow-[0_48px_130px_rgba(0,0,0,0.9)] liquid-glass">

        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <div className="flex-1 mx-8 bg-white/[0.04] border border-white/[0.07] rounded px-3 py-1 text-[11px] text-white/25 text-center tracking-tight">
            app.harkon.client.co — Dashboard
          </div>
        </div>

        {/* Dashboard body */}
        <div className="p-5 grid grid-cols-[160px_1fr] gap-4 min-h-[300px] max-[700px]:grid-cols-1">

          {/* Sidebar */}
          <div className="bg-white/[0.025] rounded-xl border border-white/[0.06] p-4 flex flex-col gap-1 max-[700px]:hidden">
            <p className="text-[10px] text-white/25 tracking-[0.1em] uppercase mb-2 px-1">Navigation</p>
            {SIDEBAR_ITEMS.map(({ label, active }) => (
              <div
                key={label}
                className={`text-[11px] px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
                  active
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/35 hover:bg-white/[0.05] hover:text-white/60'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              {STATS.map(({ val, label }) => (
                <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <div
                    className="text-[19px] font-semibold text-white leading-none mb-1"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    {val}
                  </div>
                  <div className="text-[10px] text-white/35 leading-tight">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex-1 flex flex-col gap-3">
              <p className="text-[10px] text-white/35 uppercase tracking-[0.08em] font-medium">Weekly bookings</p>
              <div className="flex items-end gap-1.5 h-[72px]">
                {BAR_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t relative overflow-hidden bg-white/[0.07]"
                    style={{ '--h': `${h}%` } as React.CSSProperties}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-white/70 rounded-t"
                      style={{ animation: `grow 1s ${i * 80}ms ease both` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

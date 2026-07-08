import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-zinc-950">
      {/* Background Accent */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Header / Navigation */}
      <header className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-zinc-950 text-sm font-bold">F</span>
            </div>
            <span className="font-bold text-base tracking-tight text-white">Farm Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-zinc-100 hover:bg-white text-zinc-950 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-zinc-100/5 hover:-translate-y-0.5 active:translate-y-0"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto px-6 flex flex-col justify-center py-20 md:py-32">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            V1.0 is now live
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-2xl mx-auto leading-tight">
            Farm Management. <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Simpler than ever.</span>
          </h1>
          
          <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Monitor crop health, livestock lifecycle, inventory levels, and financial analytics from a clean, single-screen control dashboard.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-8 py-3 rounded-lg text-base font-bold transition-all shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 hover:-translate-y-0.5"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white px-8 py-3 rounded-lg text-base font-semibold transition-all hover:bg-zinc-900/50"
            >
              Access Console
            </Link>
          </div>
        </div>

        {/* Minimal Feature Cards */}
        <div className="mt-20 md:mt-28 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 hover:bg-zinc-900/30 transition-all group">
            <div className="text-2xl mb-4 group-hover:scale-105 transition-transform duration-200 inline-block">🌿</div>
            <h3 className="text-white font-semibold text-sm mb-1.5">Crop Cycles</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Track growth phases, watering schedules, and estimated yields seamlessly.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 hover:bg-zinc-900/30 transition-all group">
            <div className="text-2xl mb-4 group-hover:scale-105 transition-transform duration-200 inline-block">🐄</div>
            <h3 className="text-white font-semibold text-sm mb-1.5">Livestock & Feed</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Manage vaccination trackers, feeding cycles, and health logs in real time.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 hover:bg-zinc-900/30 transition-all group">
            <div className="text-2xl mb-4 group-hover:scale-105 transition-transform duration-200 inline-block">📊</div>
            <h3 className="text-white font-semibold text-sm mb-1.5">Financial Audits</h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Monitor operational cost structures, sales reports, and net yield metrics.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950/40">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Farm Management System</span>
          </div>
          <p>&copy; 2026 Farm Manager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
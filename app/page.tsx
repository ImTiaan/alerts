import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-900/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm flex mb-12">
        <h1 className="text-6xl font-heading text-center text-glow text-emerald-400 drop-shadow-lg">
          Stream Alerts
        </h1>
      </div>

      <div className="grid text-center lg:max-w-5xl lg:w-full lg:grid-cols-2 lg:text-left gap-6">
        <Link
          href="/overlay"
          className="group glass-panel px-8 py-8 transition-all hover:bg-white/10 hover:scale-[1.02] hover:border-emerald-500/50"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className={`mb-3 text-3xl font-heading text-emerald-300 group-hover:text-emerald-200 transition-colors`}>
            Overlay{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm text-emerald-100/70 group-hover:text-emerald-50`}>
            Open the overlay window (for OBS).
          </p>
        </Link>

        <Link
          href="/dashboard"
          className="group glass-panel px-8 py-8 transition-all hover:bg-white/10 hover:scale-[1.02] hover:border-emerald-500/50"
        >
          <h2 className={`mb-3 text-3xl font-heading text-emerald-300 group-hover:text-emerald-200 transition-colors`}>
            Dashboard{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm text-emerald-100/70 group-hover:text-emerald-50`}>
            Control alerts and test events.
          </p>
        </Link>
      </div>
    </main>
  );
}

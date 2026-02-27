// components/navbar.tsx
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-xl bg-orange-500/90 shadow-[0_0_18px_rgba(249,115,22,0.7)]" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              ByteSize Consult
            </span>
            <span className="text-sm text-slate-200">Atlas Recon</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="/recon/quick-check" className="hover:text-white">Quick IP Check</Link>
          <Link href="/recon/dns-explorer" className="hover:text-white">DNS Explorer</Link>
          <Link href="/recon/deep-dive" className="hover:text-white">Attack Surface</Link>
          <Link href="/graph" className="hover:text-white">Graph</Link>  {/* 👈 new */}
          <Link href="/toolkit" className="hover:text-white">Toolkit</Link>
        </nav>

        <Link
          href="https://www.bytesizeconsult.ca/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_14px_rgba(249,115,22,0.7)] transition hover:brightness-110 md:inline-flex"
        >
  Book Free Consultation
        </Link>
      </div>
    </header>
  );
}

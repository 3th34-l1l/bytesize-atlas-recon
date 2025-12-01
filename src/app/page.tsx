// app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    // Send to quick check with query as search param
    router.push(`/recon/quick-check?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:py-16">
      {/* Hero */}
      <section className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400">
            Atlas Recon · ByteSize Consult MSP
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-slate-50 md:text-5xl">
            See What the Internet
            <br />
            Knows About You.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-slate-300">
            Paste an IP, domain, or CIDR, and Atlas Recon builds an exposure profile using
            passive intelligence only. Safe for security researchers, IT teams, and clients.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Paste an IP, domain, or CIDR (e.g. 45.133.1.2 or acme.com)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" className="md:min-w-[170px]">
              Analyze Exposure
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="rounded-full bg-white/5 px-3 py-1">
              Passive only · No active scanning
            </span>
            <span className="rounded-full bg-white/5 px-3 py-1">
              Powered by IPQuery · SecurityTrails · Censys
            </span>
          </div>
        </div>

        {/* Side metrics card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Live Monitoring (sample data)
            </span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
              Demo mode
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Card className="bg-slate-900/90 p-3 shadow-none">
              <p className="text-xs text-slate-400">Alerts</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">0 critical</p>
              <p className="text-xs text-emerald-400">stable</p>
            </Card>
            <Card className="bg-slate-900/90 p-3 shadow-none">
              <p className="text-xs text-slate-400">New Exposures</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">5</p>
              <p className="text-xs text-orange-300">this week</p>
            </Card>
            <Card className="bg-slate-900/90 p-3 shadow-none col-span-2">
              <p className="text-xs text-slate-400">Devices Online</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">23</p>
              <p className="text-xs text-slate-400">simulated for preview</p>
            </Card>
          </div>
        </Card>
      </section>

      {/* Shortcuts */}
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer bg-slate-900/90 hover:border-orange-400/60">
          <p className="text-xs font-semibold text-slate-400">Step 1</p>
          <p className="mt-1 text-sm font-semibold text-slate-50">Quick IP Check</p>
          <p className="mt-2 text-xs text-slate-400">
            Instant footprint for a single IP or domain.
          </p>
        </Card>
        <Card className="cursor-pointer bg-slate-900/90 hover:border-orange-400/60">
          <p className="text-xs font-semibold text-slate-400">Step 2</p>
          <p className="mt-1 text-sm font-semibold text-slate-50">DNS & Subdomain Recon</p>
          <p className="mt-2 text-xs text-slate-400">
            Enumerate subdomains and DNS records for assets.
          </p>
        </Card>
        <Card className="cursor-pointer bg-slate-900/90 hover:border-orange-400/60">
          <p className="text-xs font-semibold text-slate-400">Step 3</p>
          <p className="mt-1 text-sm font-semibold text-slate-50">Attack Surface Explorer</p>
          <p className="mt-2 text-xs text-slate-400">
            Ports, services, and vulnerability posture.
          </p>
        </Card>
        <Card className="cursor-pointer bg-slate-900/90 hover:border-orange-400/60">
          <p className="text-xs font-semibold text-slate-400">Step 4</p>
          <p className="mt-1 text-sm font-semibold text-slate-50">Watchlist & Reports</p>
          <p className="mt-2 text-xs text-slate-400">
            Monitor changes and generate client deliverables.
          </p>
        </Card>
      </section>
    </div>
  );
}

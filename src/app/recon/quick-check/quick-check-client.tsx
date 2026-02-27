// src/app/recon/quick-check/quick-check-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type EnrichResponse = {
  indicator?: string; // api/enrich uses this
  query?: string;     // older shape (just in case)
  ipquery?: any;
  censys?: any;
  securitytrails?: any;
};

export default function QuickCheckClient() {
  const params = useSearchParams();
  const initial = params.get('q') ?? '';

  const [query, setQuery] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EnrichResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(indicatorOverride?: string) {
    const indicator = (indicatorOverride ?? query).trim();
    if (!indicator) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicator }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Request failed');

      setData(json);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await run();
  }

  useEffect(() => {
    if (initial) {
      // auto-run when coming from homepage like /recon/quick-check?q=1.1.1.1
      run(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-50">Quick IP / Domain Check</h1>
      <p className="mt-2 text-sm text-slate-400">
        Get a fast footprint for a single IP or domain using passive intel only.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 md:flex-row">
        <Input
          placeholder="45.133.1.2 or acme.com"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Analyzing…' : 'Generate Footprint'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {data && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <h2 className="text-sm font-semibold text-slate-200">Identity & Geo</h2>
            <p className="mt-1 text-xs text-slate-400">
              From IPQuery (country, ASN, ISP, risk score).
            </p>
            <pre className="mt-3 max-h-60 overflow-auto rounded-xl bg-black/40 p-3 text-[11px] text-slate-200">
              {JSON.stringify(data.ipquery ?? null, null, 2)}
            </pre>
          </Card>

          <Card className="md:col-span-1">
            <h2 className="text-sm font-semibold text-slate-200">Ports & Services</h2>
            <p className="mt-1 text-xs text-slate-400">From Censys host view.</p>

            {!data.censys ? (
              <p className="mt-3 text-xs text-slate-500">
                Censys data is optional for this preview.
              </p>
            ) : (
              <pre className="mt-3 max-h-60 overflow-auto rounded-xl bg-black/40 p-3 text-[11px] text-slate-200">
                {JSON.stringify(data.censys, null, 2)}
              </pre>
            )}
          </Card>

          <Card className="md:col-span-1">
            <h2 className="text-sm font-semibold text-slate-200">DNS & Hostnames</h2>
            <p className="mt-1 text-xs text-slate-400">From SecurityTrails.</p>
            <pre className="mt-3 max-h-60 overflow-auto rounded-xl bg-black/40 p-3 text-[11px] text-slate-200">
              {JSON.stringify(data.securitytrails ?? null, null, 2)}
            </pre>
          </Card>
        </div>
      )}

      {!data && !loading && !error && (
        <p className="mt-8 text-xs text-slate-500">
          Paste an indicator above to see a sample JSON footprint.
        </p>
      )}
    </div>
  );
}
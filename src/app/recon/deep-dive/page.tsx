'use client';

// src/app/recon/deep-dive/page.tsx
import { useState } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type DeepDiveResult = {
  indicator: string;
  ipquery: any;
  censys: any;
  securitytrails: any;
  risks: string[];
};

export default function DeepDivePage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DeepDiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDeepDive(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicator: query.trim() }),
      });
      if (!res.ok) throw new Error('Failed to run deep dive.');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-50">Attack Surface Explorer</h1>
      <p className="mt-2 text-sm text-slate-400">
        Combine IP intelligence, ports, DNS, and risk signals into a single deep-dive view.
      </p>

      <form onSubmit={runDeepDive} className="mt-6 flex flex-col gap-3 md:flex-row">
        <Input
          placeholder="IP or domain to deep-dive…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Analyzing…' : 'Run Deep Dive'}
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {data && (
        <div className="mt-8 grid gap-4 md:grid-cols-[2fr_1.1fr]">
          <Card className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">
              Ports & Services
            </h2>
            <p className="text-xs text-slate-400">
              Aggregated from Censys and DNS/host metadata.
            </p>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-black/40 p-3 text-[11px] text-slate-200">
              {JSON.stringify(data.censys, null, 2)}
            </pre>
          </Card>

          <div className="space-y-4">
            <Card>
              <h2 className="text-sm font-semibold text-slate-200">Risk Highlights</h2>
              {data.risks.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-200">
                  {data.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  No specific risks flagged in this mock. Once we wire rules/ML, they&apos;ll appear here.
                </p>
              )}
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-200">Identity Snapshot</h2>
              <p className="text-xs text-slate-400">
                Condensed IPQuery + DNS data for quick orientation.
              </p>
              <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-black/40 p-3 text-[11px] text-slate-200">
                {JSON.stringify(
                  { ipquery: data.ipquery, securitytrails: data.securitytrails },
                  null,
                  2
                )}
              </pre>
            </Card>
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <p className="mt-8 text-xs text-slate-500">
          Start with a single IP or domain to see the attack surface breakdown.
        </p>
      )}
    </div>
  );
}

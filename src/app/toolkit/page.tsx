'use client';

// src/app/toolkit/page.tsx
import { useState } from 'react';
import Button from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Input from '@/components/ui/input';

type ToolkitResult = {
  indicator: string;
  ipquery: any;
  censys: any;
  securitytrails: any;
};

export default function ToolkitPage() {
  const [rawList, setRawList] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ToolkitResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function runToolkit(e: React.FormEvent) {
    e.preventDefault();
    const items = rawList
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (!items.length) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const out: ToolkitResult[] = [];

      // simple sequential calls – fine for a handful of indicators
      for (const indicator of items) {
        const res = await fetch('/api/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ indicator }),
        });

        if (!res.ok) throw new Error(`Failed to enrich: ${indicator}`);
        const json = await res.json();
        out.push({
          indicator,
          ipquery: json.ipquery,
          censys: json.censys,
          securitytrails: json.securitytrails,
        });
      }

      setResults(out);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-50">Passive Recon Toolkit</h1>
      <p className="mt-2 text-sm text-slate-400">
        Bulk-enrich IPs and domains using passive intel only. Great for bug bounty targets,
        client scoping, or quick OSINT passes.
      </p>

      <form onSubmit={runToolkit} className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Indicators
          </label>
          <textarea
            value={rawList}
            onChange={(e) => setRawList(e.target.value)}
            placeholder={'one.com\n8.8.8.8\ncorp.example.com'}
            rows={8}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-50 placeholder:text-slate-500 shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Card className="flex-1 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">Profile</h2>
            <p className="text-xs text-slate-400">
              By default, the toolkit runs IPQuery, Censys, and SecurityTrails for each indicator.
            </p>
          </Card>
          <Button type="submit" disabled={loading}>
            {loading ? 'Running Recon…' : 'Run Recon'}
          </Button>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {results.length > 0 && (
        <div className="mt-8 space-y-4">
          {results.map((row) => (
            <Card key={row.indicator} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Indicator
                  </p>
                  <p className="text-sm font-semibold text-slate-50">{row.indicator}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3 text-[11px]">
                <pre className="max-h-48 overflow-auto rounded-xl bg-black/40 p-3 text-slate-200">
                  {JSON.stringify(row.ipquery, null, 2)}
                </pre>
                <pre className="max-h-48 overflow-auto rounded-xl bg-black/40 p-3 text-slate-200">
                  {JSON.stringify(row.censys, null, 2)}
                </pre>
                <pre className="max-h-48 overflow-auto rounded-xl bg-black/40 p-3 text-slate-200">
                  {JSON.stringify(row.securitytrails, null, 2)}
                </pre>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!results.length && !loading && !error && (
        <p className="mt-8 text-xs text-slate-500">
          Paste a few targets and run recon to see bulk results.
        </p>
      )}
    </div>
  );
}

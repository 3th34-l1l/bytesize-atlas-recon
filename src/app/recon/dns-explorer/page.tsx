'use client';

// src/app/recon/dns-explorer/page.tsx
import { useState } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type DnsRecordResponse = {
  domain: string;
  dns: {
    a: string[];
    mx: string[];
    txt: string[];
    ns: string[];
  };
  subdomains: { name: string; ip?: string }[];
};

export default function DnsExplorerPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DnsRecordResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });

      if (!res.ok) throw new Error('Failed to fetch DNS data.');
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
      <h1 className="text-2xl font-semibold text-slate-50">DNS & Subdomain Explorer</h1>
      <p className="mt-2 text-sm text-slate-400">
        Map a domain&apos;s public DNS and discover subdomains using passive DNS intelligence.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col gap-3 md:flex-row"
      >
        <Input
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Discovering…' : 'Discover'}
        </Button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      {data && (
        <div className="mt-8 space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-slate-200">
              DNS Overview · <span className="text-slate-400">{data.domain}</span>
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-4 text-xs">
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-400">A</p>
                {data.dns.a.length ? data.dns.a.map((ip) => (
                  <p key={ip} className="text-slate-200">{ip}</p>
                )) : <p className="text-slate-500">None</p>}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-400">MX</p>
                {data.dns.mx.length ? data.dns.mx.map((mx) => (
                  <p key={mx} className="text-slate-200">{mx}</p>
                )) : <p className="text-slate-500">None</p>}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-400">TXT</p>
                {data.dns.txt.length ? data.dns.txt.map((txt) => (
                  <p key={txt} className="truncate text-slate-200">{txt}</p>
                )) : <p className="text-slate-500">None</p>}
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-400">NS</p>
                {data.dns.ns.length ? data.dns.ns.map((ns) => (
                  <p key={ns} className="text-slate-200">{ns}</p>
                )) : <p className="text-slate-500">None</p>}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">
                Subdomains ({data.subdomains.length})
              </h2>
              <p className="text-xs text-slate-500">
                Sample results for now – we&apos;ll plug in SecurityTrails shortly.
              </p>
            </div>

            <div className="mt-4 max-h-80 overflow-auto rounded-xl bg-black/40 text-xs">
              <table className="min-w-full text-left">
                <thead className="sticky top-0 bg-black/60">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-slate-300">Subdomain</th>
                    <th className="px-4 py-2 font-semibold text-slate-300">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subdomains.map((s) => (
                    <tr key={s.name} className="border-t border-white/5">
                      <td className="px-4 py-2 text-slate-200">{s.name}</td>
                      <td className="px-4 py-2 text-slate-400">{s.ip ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {!data && !loading && !error && (
        <p className="mt-8 text-xs text-slate-500">
          Enter a domain above to see DNS and subdomain data rendered in the dashboard.
        </p>
      )}
    </div>
  );
}

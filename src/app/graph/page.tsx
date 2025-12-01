// src/app/graph/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { GraphNode, GraphLink, Assertion } from '@/lib/graphStore';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Card } from '@/components/ui/card';

// ✅ Proper dynamic import of default export for react-force-graph-3d
const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d').then((m) => m.default),
  { ssr: false }
);

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

const ASSERTION_KEYS = [
  { value: 'category', label: 'Category' },
  { value: 'environment', label: 'Environment' },
  { value: 'owner', label: 'Owner' },
  { value: 'risk', label: 'Risk' },
  { value: 'note', label: 'Note' },
] as const;

export default function GraphPage() {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assertKey, setAssertKey] = useState<string>('note');
  const [assertValue, setAssertValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load graph once
  useEffect(() => {
    setLoading(true);
    fetch('/api/graph')
      .then(async (res) => {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('Non-JSON response from /api/graph');
        }
      })
      .then((data: GraphData) => {
        setGraph(data);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load graph data');
      })
      .finally(() => setLoading(false));
  }, []);

  // Derive the selected node from graph data + selectedId
  const selected: GraphNode | null =
    selectedId ? graph.nodes.find((n) => n.id === selectedId) ?? null : null;

  function handleNodeClick(node: any) {
    if (!node || typeof node.id !== 'string') return;
    console.log('Node clicked:', node);
    setSelectedId(node.id);
    setError(null);
  }

  async function handleAddAssertion(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !assertKey || !assertValue.trim()) return;

    setAdding(true);
    setError(null);

    try {
      const res = await fetch('/api/graph/assertions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: selected.id,
          key: assertKey,
          value: assertValue.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add assertion');
      }

      const updatedAssertions: Assertion[] = json.assertions;

      // Update graph state with new assertions for that node
      const updatedNodes = graph.nodes.map((n) =>
        n.id === selected.id ? { ...n, assertions: updatedAssertions } : n
      );
      setGraph((g) => ({ ...g, nodes: updatedNodes }));

      setAssertValue('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error adding assertion');
    } finally {
      setAdding(false);
    }
  }

  const selectedAssertions: Assertion[] =
    (selected?.assertions ?? [])
      .slice()
      .sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left: 3D graph */}
      <div className="relative flex-1 bg-black">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-300">
            Loading graph…
          </div>
        ) : (
          <ForceGraph3D
            key="atlas-graph"
            graphData={graph}
            nodeLabel={(n: any) => n.id}
            nodeAutoColorBy="type"
            onNodeClick={handleNodeClick}
          />
        )}
      </div>

      {/* Right: sidebar */}
      <aside className="flex w-96 flex-col border-l border-white/10 bg-slate-950/95 px-4 py-4">
        <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Atlas Graph
        </h1>

        {selected ? (
          <>
            {/* Node header */}
            <div className="mt-4 space-y-1">
              <p className="text-sm font-semibold text-slate-50">{selected.id}</p>
              <p className="text-xs text-slate-400">
                Type: {selected.type}
                {selected.risk && (
                  <>
                    {' · '}
                    <span
                      className={
                        selected.risk === 'high'
                          ? 'text-red-400'
                          : selected.risk === 'medium'
                          ? 'text-orange-300'
                          : 'text-emerald-300'
                      }
                    >
                      Risk: {selected.risk}
                    </span>
                  </>
                )}
              </p>
              {selected.tags && selected.tags.length > 0 && (
                <p className="text-xs text-slate-400">
                  Tags:{' '}
                  {selected.tags.map((t) => (
                    <span
                      key={t}
                      className="mr-1 inline-flex rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-200"
                    >
                      {t}
                    </span>
                  ))}
                </p>
              )}
            </div>

            {/* Assertions list */}
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              <Card className="bg-slate-900/80 p-3">
                <h2 className="text-xs font-semibold text-slate-200">
                  Assertions &amp; Notes
                </h2>
                {selectedAssertions.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No assertions yet. Use the form below to label this node.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-xs">
                    {selectedAssertions.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-white/10 bg-black/40 px-2 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-200">
                            {a.key}: <span className="font-normal text-slate-100">{a.value}</span>
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                              a.confidence >= 80
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : a.confidence >= 50
                                ? 'bg-orange-500/20 text-orange-300'
                                : 'bg-slate-600/40 text-slate-200'
                            }`}
                          >
                            {a.confidence} · {a.status}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">
                          Source: {a.sourceType}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* Add assertion form */}
            <form
              onSubmit={handleAddAssertion}
              className="mt-3 space-y-2 border-t border-white/10 pt-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                Add Assertion
              </p>
              <div className="flex gap-2">
                <select
                  className="w-32 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-slate-100 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300/70"
                  value={assertKey}
                  onChange={(e) => setAssertKey(e.target.value)}
                >
                  {ASSERTION_KEYS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <Input
                  className="text-xs"
                  placeholder="value (e.g. prod, Acme, high, note…)"
                  value={assertValue}
                  onChange={(e) => setAssertValue(e.target.value)}
                />
              </div>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={adding}
                  className="text-xs"
                >
                  {adding ? 'Saving…' : 'Save Assertion'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <p className="mt-6 text-xs text-slate-500">
            Click a node in the 3D graph to view or add assertions, labels, and notes.
          </p>
        )}
      </aside>
    </div>
  );
}

// src/app/api/graph/route.ts
import { NextResponse } from 'next/server';
import { getGraph, upsertNode, addLink } from '@/lib/graphStore';

export async function GET() {
  const graph = getGraph();
  return NextResponse.json(graph);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));

  if (body.type === 'node' && body.node) {
    upsertNode(body.node);
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'link' && body.link) {
    addLink(body.link);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported payload' }, { status: 400 });
}

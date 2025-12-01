// src/app/api/graph/assertions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  Assertion,
  AssertionSourceType,
  getNode,
  updateNodeAssertions,
} from '@/lib/graphStore';

const ALLOWED_KEYS = ['category', 'environment', 'owner', 'risk', 'note'] as const;
const ALLOWED_ENVIRONMENTS = ['prod', 'dev', 'stage', 'test', 'lab'];
const ALLOWED_RISKS = ['low', 'medium', 'high'];

function isAllowedKey(key: string): key is (typeof ALLOWED_KEYS)[number] {
  return (ALLOWED_KEYS as readonly string[]).includes(key);
}

function sanitizeValue(key: string, rawValue: unknown): string | null {
  if (typeof rawValue !== 'string') return null;
  const v = rawValue.trim();
  if (!v) return null;

  if (key === 'environment' && !ALLOWED_ENVIRONMENTS.includes(v)) {
    return null;
  }
  if (key === 'risk' && !ALLOWED_RISKS.includes(v)) {
    return null;
  }

  // basic length limit
  if (v.length > 500) return v.slice(0, 500);

  return v;
}

function computeConfidence(sourceType: AssertionSourceType, duplicateCount: number): number {
  let base = 30;

  if (sourceType === 'bytesize') base = 95;
  else if (sourceType === 'trusted_org') base = 85;
  else if (sourceType === 'system') base = 80;
  else if (sourceType === 'user') base = 40;

  if (duplicateCount >= 3) base += 10;
  else if (duplicateCount >= 2) base += 5;

  return Math.min(100, base);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { nodeId, key, value } = body ?? {};

  if (!nodeId || typeof nodeId !== 'string') {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
  }
  if (!key || typeof key !== 'string' || !isAllowedKey(key)) {
    return NextResponse.json({ error: 'key is invalid' }, { status: 400 });
  }

  const cleanedValue = sanitizeValue(key, value);
  if (!cleanedValue) {
    return NextResponse.json({ error: 'value is invalid or empty' }, { status: 400 });
  }

  const node = getNode(nodeId);
  if (!node) {
    return NextResponse.json(
      { error: `Node ${nodeId} not found in graph` },
      { status: 404 },
    );
  }

  // TODO: once you have auth, set sourceType based on user/org
  const sourceType: AssertionSourceType = 'user';
  const sourceOrgSlug: string | undefined = undefined;

  const existingAssertions = node.assertions ?? [];
  const sameKeyValue = existingAssertions.filter(
    (a) => a.key === key && a.value.toLowerCase() === cleanedValue.toLowerCase(),
  );

  const confidence = computeConfidence(sourceType, sameKeyValue.length);

  const assertion: Assertion = {
    id: `a_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    nodeId,
    key,
    value: cleanedValue,
    createdAt: new Date().toISOString(),
    sourceType,
    sourceOrgSlug,
    status: sourceType === 'user' ? 'unverified' : 'verified',
    confidence,
  };

  const updated = [...existingAssertions, assertion];
  updateNodeAssertions(nodeId, updated);

  return NextResponse.json({
    ok: true,
    assertion,
    assertions: updated,
  });
}

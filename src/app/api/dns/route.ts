// src/app/api/dns/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SECURITYTRAILS_API_BASE = 'https://api.securitytrails.com/v1';
const API_KEY = process.env.SECURITYTRAILS_API_KEY;

async function securityTrailsFetch(path: string) {
  if (!API_KEY) {
    throw new Error('SecurityTrails API key (SECURITYTRAILS_API_KEY) is not configured.');
  }

  const res = await fetch(`${SECURITYTRAILS_API_BASE}${path}`, {
    headers: {
      APIKEY: API_KEY,
      Accept: 'application/json',
    },
    // You can tweak if you want caching behavior later:
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const msg = `SecurityTrails request failed (${res.status} ${res.statusText}) - ${text}`;
    throw new Error(msg);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const domainRaw = body?.domain;

    if (typeof domainRaw !== 'string' || !domainRaw.trim()) {
      return NextResponse.json(
        { error: 'domain required (non-empty string)' },
        { status: 400 }
      );
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'SecurityTrails API key not configured on server' },
        { status: 500 }
      );
    }

    const hostname = domainRaw.trim().toLowerCase();

    // 1) Fetch domain details (DNS) & subdomains in parallel
    const [details, subs] = await Promise.all([
      securityTrailsFetch(`/domain/${encodeURIComponent(hostname)}`),
      securityTrailsFetch(`/domain/${encodeURIComponent(hostname)}/subdomains`),
    ]);

    // 2) Normalise DNS shape
    // docs: details.current_dns.{a,mx,txt,ns} etc. :contentReference[oaicite:3]{index=3}
    const dns = {
      a: Array.isArray(details?.current_dns?.a)
        ? details.current_dns.a.map((r: any) => r.ip).filter(Boolean)
        : [],
      mx: Array.isArray(details?.current_dns?.mx)
        ? details.current_dns.mx.map((r: any) => r.hostname).filter(Boolean)
        : [],
      txt: Array.isArray(details?.current_dns?.txt)
        ? details.current_dns.txt.map((r: any) => r.value).filter(Boolean)
        : [],
      ns: Array.isArray(details?.current_dns?.ns)
        ? details.current_dns.ns.map((r: any) => r.nameserver).filter(Boolean)
        : [],
    };

    // 3) Normalise subdomains
    // docs: /domain/{hostname}/subdomains returns { subdomains: ["api","dev",...] } :contentReference[oaicite:4]{index=4}
    const rawSubdomains: string[] = Array.isArray(subs?.subdomains)
      ? subs.subdomains
      : [];

    const subdomains = rawSubdomains.map((label) => ({
      name: `${label}.${hostname}`,
      ip: undefined as string | undefined, // you can later enrich with A records if you want
    }));

    // 4) Response in the exact shape your page.tsx expects
    return NextResponse.json({
      domain: hostname,
      dns,
      subdomains,
    });
  } catch (err: any) {
    console.error('[api/dns] error', err);

    // Simple 502 for upstream issues; you can inspect err.message for rate-limit vs others
    return NextResponse.json(
      {
        error: 'Failed to fetch DNS data from SecurityTrails',
        details: process.env.NODE_ENV === 'development' ? String(err.message ?? err) : undefined,
      },
      { status: 502 }
    );
  }
}

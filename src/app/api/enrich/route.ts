// src/app/api/enrich/route.ts
import { NextRequest, NextResponse } from 'next/server';

const IPQUERY_BASE = 'https://api.ipquery.io';
const CENSYS_BASE = 'https://api.platform.censys.io/v3/global/asset';
const SECURITYTRAILS_BASE = 'https://api.securitytrails.com/v1';

const CENSYS_API_TOKEN = process.env.CENSYS_API_TOKEN;
const CENSYS_ORG_ID = process.env.CENSYS_ORG_ID;
const SECURITYTRAILS_API_KEY = process.env.SECURITYTRAILS_API_KEY;

function isIPv4(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

async function fetchIpQuery(indicator: string) {
  if (!isIPv4(indicator)) return null;

  try {
    const res = await fetch(`${IPQUERY_BASE}/${encodeURIComponent(indicator)}`, {
      headers: { accept: 'application/json' },
      // don't cache intel
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error('[ipquery] HTTP', res.status, await res.text());
      return null;
    }

    return res.json();
  } catch (err) {
    console.error('[ipquery] fetch error', err);
    return { error: 'IPQuery request failed' };
  }
}

async function fetchCensys(indicator: string) {
  if (!CENSYS_API_TOKEN || !isIPv4(indicator)) return null;

  const headers: HeadersInit = {
    Accept: 'application/vnd.censys.api.v3.host.v1+json',
    Authorization: `Bearer ${CENSYS_API_TOKEN}`,
  };
  if (CENSYS_ORG_ID) {
    headers['X-Organization-ID'] = CENSYS_ORG_ID;
  }

  try {
    const res = await fetch(
      `${CENSYS_BASE}/host/${encodeURIComponent(indicator)}`,
      {
        headers,
        next: { revalidate: 0 },
      },
    );

    if (!res.ok) {
      console.error('[censys] HTTP', res.status, await res.text());
      return { error: `Censys error ${res.status}` };
    }

    const data = await res.json();
    // The interesting bit is in result.resource per Censys docs
    // We return both full data and a tiny summary for your cards.
    const resource = data?.result?.resource ?? data;

    const endpoints = Array.isArray(resource.endpoints)
      ? resource.endpoints
      : [];

    const openPorts = Array.from(
      new Set(
        endpoints
          .map((e: any) => e.port)
          .filter((p: any) => typeof p === 'number'),
      ),
    );

    return {
      open_ports: openPorts,
      endpoints,
      raw: resource,
    };
  } catch (err) {
    console.error('[censys] fetch error', err);
    return { error: 'Censys request failed' };
  }
}

async function fetchSecurityTrails(indicator: string) {
  if (!SECURITYTRAILS_API_KEY) return null;

  const headers: HeadersInit = {
    Accept: 'application/json',
    Apikey: SECURITYTRAILS_API_KEY,
  };

  const isIp = isIPv4(indicator);

  // For domains: /domain/{hostname}
  // For IPs: /ips/{ipaddress}/whois
  const path = isIp
    ? `/ips/${encodeURIComponent(indicator)}/whois`
    : `/domain/${encodeURIComponent(indicator)}`;

  try {
    const res = await fetch(`${SECURITYTRAILS_BASE}${path}`, {
      headers,
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error('[securitytrails] HTTP', res.status, await res.text());
      return { error: `SecurityTrails error ${res.status}` };
    }

    return res.json();
  } catch (err) {
    console.error('[securitytrails] fetch error', err);
    return { error: 'SecurityTrails request failed' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const rawIndicator =
      body.indicator ?? body.query ?? body.ip ?? body.domain ?? '';
    const indicator = String(rawIndicator || '').trim();

    if (!indicator) {
      return NextResponse.json(
        { error: 'indicator required' },
        { status: 400 },
      );
    }

    const [ipquery, censys, securitytrails] = await Promise.all([
      fetchIpQuery(indicator),
      fetchCensys(indicator),
      fetchSecurityTrails(indicator),
    ]);

    return NextResponse.json({
      indicator,
      ipquery,
      censys,
      securitytrails,
    });
  } catch (err) {
    console.error('[api/enrich] unexpected error', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 },
    );
  }
}

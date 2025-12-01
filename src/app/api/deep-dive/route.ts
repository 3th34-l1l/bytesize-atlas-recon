// src/app/api/deep-dive/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Reuse same constants & helpers as /api/enrich.
// If you prefer, extract them to src/lib/recon/enrich.ts and import in both.

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
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error('[ipquery] HTTP', res.status, await res.text());
      return { error: `IPQuery error ${res.status}` };
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

async function fetchSecurityTrailsCore(indicator: string) {
  if (!SECURITYTRAILS_API_KEY) return null;

  const headers: HeadersInit = {
    Accept: 'application/json',
    Apikey: SECURITYTRAILS_API_KEY,
  };

  const isIp = isIPv4(indicator);
  const path = isIp
    ? `/ips/${encodeURIComponent(indicator)}/whois`
    : `/domain/${encodeURIComponent(indicator)}`;

  try {
    const res = await fetch(`${SECURITYTRAILS_BASE}${path}`, {
      headers,
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error('[securitytrails core] HTTP', res.status, await res.text());
      return null;
    }

    return res.json();
  } catch (err) {
    console.error('[securitytrails core] fetch error', err);
    return { error: 'SecurityTrails core request failed' };
  }
}

async function fetchSecurityTrailsSubdomains(indicator: string) {
  if (!SECURITYTRAILS_API_KEY || !indicator || isIPv4(indicator)) {
    // Subdomains only make sense for domains
    return null;
  }

  const headers: HeadersInit = {
    Accept: 'application/json',
    Apikey: SECURITYTRAILS_API_KEY,
  };

  const path = `/domain/${encodeURIComponent(indicator)}/subdomains`;

  try {
    const res = await fetch(`${SECURITYTRAILS_BASE}${path}`, {
      headers,
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error(
        '[securitytrails subdomains] HTTP',
        res.status,
        await res.text(),
      );
      return { error: `SecurityTrails subdomains error ${res.status}` };
    }

    return res.json();
  } catch (err) {
    console.error('[securitytrails subdomains] fetch error', err);
    return { error: 'SecurityTrails subdomains request failed' };
  }
}

type RiskSummary = {
  overall_label: 'low' | 'medium' | 'high';
  overall_score: number; // 0–100
  findings: string[];
};

function buildRiskSummary(args: {
  indicator: string;
  ipquery: any;
  censys: any;
  securitytrails: any;
  subdomains: any;
}): RiskSummary {
  const findings: string[] = [];

  let score = 20; // baseline

  const ipRisk = args.ipquery?.risk ?? args.ipquery?.risk_score
    ? args.ipquery.risk
    : null;

  const openPorts: number[] = Array.isArray(args.censys?.open_ports)
    ? args.censys.open_ports
    : [];

  const subdomainList: string[] = Array.isArray(args.subdomains?.subdomains)
    ? args.subdomains.subdomains
    : Array.isArray(args.subdomains?.records)
    ? args.subdomains.records
    : [];

  // 1) IPQuery risk signals
  if (ipRisk) {
    if (typeof ipRisk.risk_score === 'number') {
      score = Math.max(score, ipRisk.risk_score);
      findings.push(
        `IPQuery risk score: ${ipRisk.risk_score} (0 = low, 100 = critical).`,
      );
    }

    if (ipRisk.is_datacenter) {
      score = Math.max(score, 55);
      findings.push(
        'IP is flagged as datacenter/hosting — likely server infrastructure, not a residential endpoint.',
      );
    }
    if (ipRisk.is_vpn) {
      score = Math.max(score, 60);
      findings.push('IP is flagged as VPN — may be anonymised or transient.');
    }
    if (ipRisk.is_tor) {
      score = Math.max(score, 75);
      findings.push('IP is flagged as Tor exit node — often abused in attacks.');
    }
    if (ipRisk.is_proxy) {
      score = Math.max(score, 50);
      findings.push(
        'IP looks like a proxy — traffic origin may be obfuscated or shared.',
      );
    }
  }

  // 2) Censys service exposure
  if (openPorts.length) {
    findings.push(
      `Censys observed the following open ports: ${openPorts
        .slice(0, 15)
        .join(', ')}.`,
    );

    const dangerous = openPorts.filter((p) =>
      [22, 23, 3389, 5900, 5985, 5986].includes(p),
    );
    if (dangerous.length) {
      score = Math.max(score, 70);
      findings.push(
        `High-risk remote access surface detected on ports ${dangerous.join(
          ', ',
        )} (SSH/RDP/management). Ensure strong auth + network controls.`,
      );
    }

    if (openPorts.includes(80) && !openPorts.includes(443)) {
      score = Math.max(score, 55);
      findings.push(
        'HTTP (80) exposed without clear HTTPS (443) companion — check for plaintext services and enforce TLS where possible.',
      );
    }
  }

  // 3) SecurityTrails footprint
  const subCount = subdomainList.length;
  if (subCount > 0) {
    findings.push(
      `SecurityTrails reports ~${subCount} subdomains — broad DNS footprint that may hide legacy or test services.`,
    );
    if (subCount > 50) {
      score = Math.max(score, 65);
      findings.push(
        'Large subdomain surface — prioritise discovering which hosts are internet-reachable and in-scope.',
      );
    }
  }

  // Clamp score and label
  score = Math.max(0, Math.min(100, score));

  let overall_label: RiskSummary['overall_label'] = 'low';
  if (score >= 70) overall_label = 'high';
  else if (score >= 40) overall_label = 'medium';

  if (findings.length === 0) {
    findings.push(
      'No obvious high-risk signals detected from passive sources. This does NOT guarantee safety — validate with active testing and context.',
    );
  }

  return {
    overall_label,
    overall_score: score,
    findings,
  };
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

    const [ipquery, censys, securitytrailsCore, subdomains] =
      await Promise.all([
        fetchIpQuery(indicator),
        fetchCensys(indicator),
        fetchSecurityTrailsCore(indicator),
        fetchSecurityTrailsSubdomains(indicator),
      ]);

    const risks = buildRiskSummary({
      indicator,
      ipquery,
      censys,
      securitytrails: securitytrailsCore,
      subdomains,
    });

    return NextResponse.json({
      indicator,
      ipquery,
      censys,
      securitytrails: {
        core: securitytrailsCore,
        subdomains,
      },
      risks,
    });
  } catch (err) {
    console.error('[api/deep-dive] unexpected error', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 },
    );
  }
}

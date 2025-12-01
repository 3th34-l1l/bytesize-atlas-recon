// src/lib/graphStore.ts
export type NodeType = 'ip' | 'domain' | 'subdomain' | 'asn';

export type AssertionSourceType = 'system' | 'bytesize' | 'trusted_org' | 'user';

export type AssertionStatus = 'unverified' | 'verified' | 'disputed';

export type Assertion = {
  id: string;
  nodeId: string;
  key: string;
  value: string;
  createdAt: string;
  sourceType: AssertionSourceType;
  sourceOrgSlug?: string;
  status: AssertionStatus;
  confidence: number;
};

export type GraphNode = {
  id: string;
  type: NodeType;
  risk?: 'low' | 'medium' | 'high';
  tags?: string[];
  assertions?: Assertion[];
};

export type GraphLink = {
  source: string;
  target: string;
  relation: 'resolves_to' | 'same_asn' | 'same_org' | 'manual';
};

// ---- in-memory graph (dev/demo only) ----

let nodes: GraphNode[] = [
  {
    id: '8.8.8.8',
    type: 'ip',
    risk: 'low',
    tags: ['public-dns'],
    assertions: [],
  },
  {
    id: 'google.com',
    type: 'domain',
    risk: 'low',
    tags: ['example'],
    assertions: [],
  },
];

let links: GraphLink[] = [
  {
    source: 'google.com',
    target: '8.8.8.8',
    relation: 'resolves_to',
  },
];

export function getGraph() {
  return { nodes, links };
}

export function getNode(nodeId: string): GraphNode | undefined {
  return nodes.find((n) => n.id === nodeId);
}

export function upsertNode(node: GraphNode) {
  const idx = nodes.findIndex((n) => n.id === node.id);
  if (idx >= 0) {
    nodes[idx] = {
      ...nodes[idx],
      ...node,
      assertions: node.assertions ?? nodes[idx].assertions,
    };
  } else {
    nodes.push({ ...node, assertions: node.assertions ?? [] });
  }
}

export function addLink(link: GraphLink) {
  const exists = links.some(
    (l) =>
      l.source === link.source &&
      l.target === link.target &&
      l.relation === link.relation,
  );
  if (!exists) links.push(link);
}

export function updateNodeAssertions(nodeId: string, assertions: Assertion[]) {
  const idx = nodes.findIndex((n) => n.id === nodeId);
  if (idx >= 0) {
    nodes[idx] = { ...nodes[idx], assertions };
  }
}

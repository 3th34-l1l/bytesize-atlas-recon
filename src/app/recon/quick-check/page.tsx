// src/app/recon/quick-check/page.tsx
import { Suspense } from 'react';
import QuickCheckClient from './quick-check-client';

export default function QuickCheckPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-200">Loading…</div>}>
      <QuickCheckClient />
    </Suspense>
  );
}
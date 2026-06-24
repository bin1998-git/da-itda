import { Suspense } from 'react';
import ExchangeHandler from './ExchangeHandler';

export default function ExchangePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <ExchangeHandler />
    </Suspense>
  );
}

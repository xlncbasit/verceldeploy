// src/components/RedirectComponent.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RedirectComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Default parameters
   

    const params = new URLSearchParams();

    // Use URL parameters if they exist, otherwise use defaults
    

    // Redirect to customize page with parameters
    router.push(`/customize?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to customizer...</p>
      </div>
    </div>
  );
}

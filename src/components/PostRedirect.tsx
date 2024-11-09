'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PostRedirect() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleRedirect() {
      try {
        // Get the current URL parameters
        const currentUrl = window.location.href;
        const url = new URL(currentUrl);
        const params = url.searchParams;

        // Redirect to customize page with the exact same parameters
        router.push(`/customize?${params.toString()}`);
      } catch (error) {
        console.error('Error during redirect:', error);
        setError('Failed to redirect');
      }
    }

    handleRedirect();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to customizer...</p>
      </div>
    </div>
  );
}

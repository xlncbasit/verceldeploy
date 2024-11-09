'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParameterTestPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the chat interface page
    router.push('/customize');
  }, [router]);

  return null; // No UI needed as it redirects immediately
}

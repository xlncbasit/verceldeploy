//src/components/Chat/ChatWrapper.tsx
'use client';

import dynamic from 'next/dynamic';
import { ConfigParams } from '@/types';
import Loading from '@/components/ui/loading';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Dynamically import ChatInterface with loading fallback
const ChatInterface = dynamic(() => import('./ChatInterface'), {
  ssr: false,
  loading: () => <Loading />
});

interface ChatWrapperProps {
  params: ConfigParams;
}

export default function ChatWrapper({ params }: ChatWrapperProps) {
  // Validate required parameters
  if (!params?.moduleKey || !params?.orgKey) {
    return (
      <div className="flex items-center justify-center min-h-[600px] text-red-500">
        Missing required configuration parameters.
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center min-h-[600px] text-red-500">
          Something went wrong with the chat interface.
        </div>
      }
    >
      <Suspense fallback={<Loading />}>
        <ChatInterface params={params} />
      </Suspense>
    </ErrorBoundary>
  );
}
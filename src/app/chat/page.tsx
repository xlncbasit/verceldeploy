//src/app/chat/page.tsx
"use client";
import type { Metadata } from 'next';
import ChatWrapper from '@/components/Chat/ChatWrapper';
import { ConfigParams } from '@/types';
import React, {useState, useEffect} from 'react';




type SearchParams = {
  org_key?: string;
  user_key?: string;
  module_key?: string;
  industry?: string;
  subindustry?: string;
}

export default function ChatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> // Update to Promise<SearchParams>
}) {
  const [params, setParams] = React.useState<ConfigParams | null>(null);

  React.useEffect(() => {
    searchParams.then(sp => {
      if (!sp.org_key || !sp.module_key) {
        throw new Error(
          'Missing required parameters: org_key and module_key must be provided'
        );
      }

      setParams({
        orgKey: sp.org_key,
        userKey: sp.user_key ?? '',
        moduleKey: sp.module_key,
        industry: sp.industry ?? '',
        subIndustry: sp.subindustry ?? ''
      });
    });
  }, [searchParams]);

  if (!params) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg">
          <ChatWrapper params={params} />
        </div>
      </div>
    </div>
  );
}

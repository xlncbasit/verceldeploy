//src/app/customize/CustomizeContent.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ChatInterface from '@/components/Chat/ChatInterface'; // Changed to default import
import { ConfigParams } from '@/types';
import Loading from '@/components/ui/loading';

export default function CustomizeContent() {
  const searchParams = useSearchParams();
  const [params, setParams] = useState<ConfigParams | null>(null);

  useEffect(() => {
    const configParams: ConfigParams = {
      orgKey: searchParams.get('org_key') || '',
      userKey: searchParams.get('user_key') || '',
      moduleKey: searchParams.get('module_key') || '',
      industry: searchParams.get('industry') || '',
      subIndustry: searchParams.get('subindustry') || ''
    };
    setParams(configParams);
  }, [searchParams]);

  if (!params) {
    return <Loading />;
  }

  return <ChatInterface params={params} />;
}
// src/components/RedirectComponent.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConfigParams } from '@/types';

interface ErrorState {
  message: string;
  details?: string;
}

interface ValidationResult {
  isValid: boolean;
  missingParams: string[];
}

export default function RedirectComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);

  // Validate required parameters
  const validateParams = (params: Partial<ConfigParams>): ValidationResult => {
    const requiredParams = ['orgKey', 'moduleKey'];
    const missingParams = requiredParams.filter(param => 
      !params[param as keyof ConfigParams]
    );

    return {
      isValid: missingParams.length === 0,
      missingParams
    };
  };

  // Extract and format parameters from URL
  const getConfigParams = (): Partial<ConfigParams> => {
    return {
      orgKey: searchParams.get('org_key') || '',
      userKey: searchParams.get('user_key') || '',
      moduleKey: searchParams.get('module_key') || '',
      industry: searchParams.get('industry') || '',
      subIndustry: searchParams.get('subindustry') || ''
    };
  };

  // Construct URL parameters for redirection
  const constructUrlParams = (params: Partial<ConfigParams>): string => {
    const urlParams = new URLSearchParams();
    if (params.orgKey) urlParams.set('org_key', params.orgKey);
    if (params.moduleKey) urlParams.set('module_key', params.moduleKey);
    if (params.industry) urlParams.set('industry', params.industry);
    if (params.subIndustry) urlParams.set('subindustry', params.subIndustry);
    if (params.userKey) urlParams.set('user_key', params.userKey);
    return urlParams.toString();
  };

  // Check configuration existence
  const checkConfiguration = async (params: Partial<ConfigParams>): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/check-config?org_key=${params.orgKey}&module_key=${params.moduleKey}`
      );

      if (!response.ok) {
        throw new Error('Failed to check configuration status');
      }

      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('Configuration check error:', error);
      throw new Error('Failed to verify configuration existence');
    }
  };

  // Handle redirection based on configuration existence
  const handleRedirect = async (exists: boolean, params: string) => {
    try {
      if (exists) {
        // Redirect to existing configuration viewer
        window.location.href = `https://customizer.fieldmobi.ai/edit?${params}`;
      } else {
        // Redirect to chat interface for new configuration
        router.push(`/customize?${params}`);
      }
    } catch (error) {
      throw new Error('Failed to perform redirect');
    }
  };

  useEffect(() => {
    const initializeRedirect = async () => {
      try {
        // Get and validate parameters
        const params = getConfigParams();
        const validation = validateParams(params);

        if (!validation.isValid) {
          setError({
            message: 'Missing required parameters',
            details: `Required: ${validation.missingParams.join(', ')}`
          });
          setIsLoading(false);
          return;
        }

        // Check configuration and redirect
        const configExists = await checkConfiguration(params);
        const urlParams = constructUrlParams(params);
        await handleRedirect(configExists, urlParams);

      } catch (error) {
        console.error('Redirect error:', error);
        setError({
          message: 'Failed to process redirect',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeRedirect();
  }, [router, searchParams]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking configuration...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-red-600 text-xl font-semibold mb-2">
              {error.message}
            </div>
            {error.details && (
              <div className="text-gray-600 text-sm mb-4">
                {error.details}
              </div>
            )}
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200"
              >
                Retry
              </button>
              <button 
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition duration-200"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default loading state (should rarely be seen)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
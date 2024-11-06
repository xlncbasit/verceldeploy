// src/app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Preset {
  org_key: string;
  user_key: string;
  module_key: string;
  industry: string;
  subindustry: string;
}

const PRESETS: Record<string, Preset> = {
  preset1: {
    org_key: 'ingentas.io',
    user_key: 'srklite12@gmail.com',
    module_key: 'FM_INFO_PRODUCT',
    industry: 'Manufacturing',
    subindustry: 'Robotics and Automation'
  },
  preset2: {
    org_key: 'test.fieldmobi.com',
    user_key: 'basit.shaikh@fieldmobi.com',
    module_key: 'BALLMAT_CARGMNGR_LIST',
    industry: 'Logistics',
    subindustry: 'Transportation'
  },
  preset3: {
    org_key: 'demo.fieldmobi.com',
    user_key: 'demo.user@fieldmobi.com',
    module_key: 'CRM_CUSTOMER_LIST',
    industry: 'Retail',
    subindustry: 'E-commerce'
  }
};

export default function ParameterTestPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Preset>(PRESETS.preset1);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');

  const loadPreset = (presetKey: keyof typeof PRESETS) => {
    setFormData(PRESETS[presetKey]);
    generateUrl(PRESETS[presetKey]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateUrl = (data: Preset = formData) => {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    const url = `/customize?${params.toString()}`;
    setGeneratedUrl(url);
    return url;
  };

  const handleRedirect = () => {
    const url = generateUrl();
    router.push(url);
  };

  const resetForm = () => {
    setFormData(PRESETS.preset1);
    setGeneratedUrl('');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-5">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Fieldmobi Parameter Test Tool
        </h1>

        <div className="flex gap-3 mb-6 flex-wrap">
          {Object.keys(PRESETS).map((preset) => (
            <button
              key={preset}
              onClick={() => loadPreset(preset as keyof typeof PRESETS)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
            >
              Load {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>

        <form className="space-y-4">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="form-group">
              <label htmlFor={key} className="block text-sm font-semibold text-gray-700 mb-1">
                {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:
              </label>
              <input
                type="text"
                id={key}
                name={key}
                value={value}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={`Enter ${key.replace(/_/g, ' ')}`}
              />
            </div>
          ))}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleRedirect}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition-colors"
            >
              Launch Chat Interface
            </button>
            <button
              type="button"
              onClick={() => generateUrl()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold transition-colors"
            >
              Generate URL
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold transition-colors"
            >
              Reset
            </button>
          </div>
        </form>

        {generatedUrl && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Generated URL:</h3>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
              {generatedUrl}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
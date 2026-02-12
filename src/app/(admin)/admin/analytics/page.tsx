'use client';

import { useState, useEffect } from 'react';

interface AnalyticsConfig {
  googleAnalyticsId: string;
  googleTagManagerId: string;
  microsoftClarityId: string;
  facebookPixelId: string;
  hotjarId: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  googleAnalyticsId: '',
  googleTagManagerId: '',
  microsoftClarityId: '',
  facebookPixelId: '',
  hotjarId: '',
  enabled: true,
};

export default function AnalyticsAdminPage() {
  const [config, setConfig] = useState<AnalyticsConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved config
    fetch('/api/v1/admin/analytics')
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setConfig(data.config);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/v1/admin/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Analytics & Tag Manager</h1>
          <p className="text-gray-400">
            Configure tracking and analytics integrations for poker.jeremysarda.com
          </p>
        </div>

        {/* Success message */}
        {saved && (
          <div className="mb-6 bg-teal-500/10 border border-teal-500/50 text-teal-400 px-4 py-3 rounded-lg">
            ✓ Settings saved successfully! Changes will take effect on next page load.
          </div>
        )}

        {/* Main toggle */}
        <div className="bg-[#262626] rounded-xl p-6 mb-6">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-white font-medium">Enable Analytics</span>
              <p className="text-gray-400 text-sm">Master switch for all tracking scripts</p>
            </div>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => setConfig({ ...config, enabled: e.target.checked })}
              className="w-6 h-6 accent-teal-500"
            />
          </label>
        </div>

        {/* Google Analytics */}
        <div className="bg-[#262626] rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-[#F9AB00] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Google Analytics 4</h3>
              <p className="text-gray-400 text-sm">Track page views, events, and user behavior</p>
            </div>
          </div>
          <input
            type="text"
            value={config.googleAnalyticsId}
            onChange={e => setConfig({ ...config, googleAnalyticsId: e.target.value })}
            placeholder="G-XXXXXXXXXX"
            className="w-full bg-[#333333] text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-teal-500"
          />
          <p className="text-gray-500 text-sm mt-2">
            Get your Measurement ID from{' '}
            <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
              Google Analytics
            </a>
          </p>
        </div>

        {/* Google Tag Manager */}
        <div className="bg-[#262626] rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-[#246FDB] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Google Tag Manager</h3>
              <p className="text-gray-400 text-sm">Centralized tag management for all your tracking</p>
            </div>
          </div>
          <input
            type="text"
            value={config.googleTagManagerId}
            onChange={e => setConfig({ ...config, googleTagManagerId: e.target.value })}
            placeholder="GTM-XXXXXXX"
            className="w-full bg-[#333333] text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-teal-500"
          />
          <p className="text-gray-500 text-sm mt-2">
            Get your Container ID from{' '}
            <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
              Google Tag Manager
            </a>
          </p>
        </div>

        {/* Microsoft Clarity */}
        <div className="bg-[#262626] rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-[#0078D4] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.17 2.06A13.1 13.1 0 0 0 19 1.87a12.94 12.94 0 0 0-7 2.05 12.94 12.94 0 0 0-7-2.05 13.1 13.1 0 0 0-2.17.19L2 2.19v12.67l.83.14a13.1 13.1 0 0 1 2.17-.19 12.94 12.94 0 0 1 7 2.05 12.94 12.94 0 0 1 7-2.05 13.1 13.1 0 0 1 2.17.19l.83-.14V2.19l-.83-.13zM11 14.54a14.9 14.9 0 0 0-6-1.65V4a11.06 11.06 0 0 1 6 1.69v8.85zm8 0a14.9 14.9 0 0 0-6 1.65V5.69A11.06 11.06 0 0 1 19 4v8.89z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Microsoft Clarity</h3>
              <p className="text-gray-400 text-sm">Heatmaps, session recordings, and user insights (free)</p>
            </div>
          </div>
          <input
            type="text"
            value={config.microsoftClarityId}
            onChange={e => setConfig({ ...config, microsoftClarityId: e.target.value })}
            placeholder="xxxxxxxxxx"
            className="w-full bg-[#333333] text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-teal-500"
          />
          <p className="text-gray-500 text-sm mt-2">
            Get your Project ID from{' '}
            <a href="https://clarity.microsoft.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
              Microsoft Clarity
            </a>
          </p>
        </div>

        {/* Facebook Pixel */}
        <div className="bg-[#262626] rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Facebook Pixel</h3>
              <p className="text-gray-400 text-sm">Track conversions for Facebook/Instagram ads</p>
            </div>
          </div>
          <input
            type="text"
            value={config.facebookPixelId}
            onChange={e => setConfig({ ...config, facebookPixelId: e.target.value })}
            placeholder="XXXXXXXXXXXXXXXX"
            className="w-full bg-[#333333] text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Hotjar */}
        <div className="bg-[#262626] rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-[#FD3A5C] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Hotjar</h3>
              <p className="text-gray-400 text-sm">Heatmaps, recordings, and feedback polls</p>
            </div>
          </div>
          <input
            type="text"
            value={config.hotjarId}
            onChange={e => setConfig({ ...config, hotjarId: e.target.value })}
            placeholder="XXXXXXX"
            className="w-full bg-[#333333] text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-4">
          <a
            href="/admin"
            className="px-6 py-3 text-gray-400 hover:text-white transition"
          >
            Cancel
          </a>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-400 transition"
          >
            Save Settings
          </button>
        </div>

        {/* Info box */}
        <div className="mt-8 bg-[#262626] rounded-xl p-6 border border-gray-700">
          <h3 className="text-white font-medium mb-2">📊 About Analytics</h3>
          <p className="text-gray-400 text-sm">
            This poker demo is part of Jeremy Sarda&apos;s portfolio at{' '}
            <a href="https://jeremysarda.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
              jeremysarda.com
            </a>
            . Analytics help understand how visitors use the application. All data is used solely
            for improving the user experience. No personal gameplay data is shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}

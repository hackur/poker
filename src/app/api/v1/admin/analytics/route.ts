import { NextRequest, NextResponse } from 'next/server';

// Analytics config store (globalThis for HMR)
const CONFIG_KEY = '__analyticsConfig__';

interface AnalyticsConfig {
  googleAnalyticsId: string;
  googleTagManagerId: string;
  microsoftClarityId: string;
  facebookPixelId: string;
  hotjarId: string;
  enabled: boolean;
}

function getConfig(): AnalyticsConfig {
  const g = globalThis as Record<string, unknown>;
  if (!g[CONFIG_KEY]) {
    g[CONFIG_KEY] = {
      googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID ?? '',
      googleTagManagerId: process.env.GTM_ID ?? '',
      microsoftClarityId: process.env.CLARITY_ID ?? '',
      facebookPixelId: '',
      hotjarId: '',
      enabled: true,
    };
  }
  return g[CONFIG_KEY] as AnalyticsConfig;
}

function setConfig(config: AnalyticsConfig): void {
  const g = globalThis as Record<string, unknown>;
  g[CONFIG_KEY] = config;
}

/** GET /api/v1/admin/analytics — Get analytics config */
export async function GET() {
  // TODO: Add admin auth check
  return NextResponse.json({ config: getConfig() });
}

/** POST /api/v1/admin/analytics — Update analytics config */
export async function POST(request: NextRequest) {
  // TODO: Add admin auth check
  try {
    const config = await request.json();
    setConfig(config);
    return NextResponse.json({ success: true, config });
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid config' },
      { status: 400 }
    );
  }
}

// Note: Use fetch('/api/v1/admin/analytics') to get config from client

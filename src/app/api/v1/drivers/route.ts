export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { checkProviderHealth, warmupModel } from '@/lib/poker/bot-drivers';
import { getDrivers } from '@/lib/driver-store';

/** GET /api/v1/drivers — List all configured drivers */
export async function GET() {
  return NextResponse.json({ drivers: getDrivers() });
}

/** POST /api/v1/drivers — Create or update a driver */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'check_health': {
      const { driverId } = body;
      const driver = getDrivers().find((d) => d.id === driverId);
      if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

      const status = await checkProviderHealth(driver);
      driver.status = status;
      return NextResponse.json({ driverId, status });
    }

    case 'check_all': {
      const results: Record<string, string> = {};
      for (const driver of getDrivers()) {
        driver.status = await checkProviderHealth(driver);
        results[driver.id] = driver.status;
      }
      return NextResponse.json({ results });
    }

    case 'warmup': {
      const { driverId } = body;
      const driver = getDrivers().find((d) => d.id === driverId);
      if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

      const result = await warmupModel(driver);
      if (result.success) driver.status = 'connected';
      return NextResponse.json({ driverId, ...result });
    }

    case 'update': {
      const { driverId, updates } = body;
      const driver = getDrivers().find((d) => d.id === driverId);
      if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

      // Safely merge allowed fields
      if (updates.displayName !== undefined) driver.displayName = updates.displayName;
      if (updates.modelId !== undefined) driver.modelId = updates.modelId;
      if (updates.baseUrl !== undefined) driver.baseUrl = updates.baseUrl;
      if (updates.apiKey !== undefined) driver.apiKey = updates.apiKey;
      if (updates.enabled !== undefined) driver.enabled = updates.enabled;
      if (updates.transparency !== undefined) driver.transparency = updates.transparency;
      if (updates.personality?.systemPrompt !== undefined) {
        driver.personality.systemPrompt = updates.personality.systemPrompt;
      }
      if (updates.personality?.style !== undefined) {
        driver.personality.style = updates.personality.style;
      }

      driver.status = 'unchecked';
      return NextResponse.json({ driver });
    }

    case 'add': {
      const { driver } = body;
      if (!driver?.id || !driver?.modelId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      getDrivers().push(driver);
      return NextResponse.json({ driver });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

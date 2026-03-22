// filepath: server/routes/airport.ts
import { Router } from 'express';
import NodeCache from 'node-cache';

const router = Router();
const cache = new NodeCache({ stdTTL: 86400 }); // 24h

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

router.get('/:icao', async (req, res) => {
  const icao = req.params.icao.toUpperCase();

  const cached = cache.get(icao);
  if (cached) { res.json(cached); return; }

  // Fetch all airport surface features:
  // runways, taxiways, taxilanes, aprons, terminals, holding positions
  const query = `[out:json][timeout:30];
area[icao="${icao}"]->.a;
(
  way(area.a)[aeroway=runway];
  way(area.a)[aeroway=taxiway];
  way(area.a)[aeroway=taxilane];
  way(area.a)[aeroway=apron];
  way(area.a)[aeroway=terminal];
  node(area.a)[aeroway=holding_position];
);
out geom;`;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) { res.status(502).json({ error: 'Overpass API error' }); return; }

    const data = await response.json();
    cache.set(icao, data);
    res.json(data);
  } catch (err) {
    console.error('Overpass fetch error:', err);
    res.status(502).json({ error: 'Overpass API unreachable' });
  }
});

export default router;

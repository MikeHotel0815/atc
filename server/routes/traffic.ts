// filepath: server/routes/traffic.ts
import { Router } from 'express';
import NodeCache from 'node-cache';

const router = Router();
const cache = new NodeCache({ stdTTL: 15 }); // 15s live traffic

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

router.get('/', async (req, res) => {
  const { lamin, lamax, lomin, lomax } = req.query;

  if (!lamin || !lamax || !lomin || !lomax) {
    res.status(400).json({ error: 'Missing bbox params' });
    return;
  }

  const key = `${lamin}:${lamax}:${lomin}:${lomax}`;
  const cached = cache.get(key);
  if (cached) {
    res.json(cached);
    return;
  }

  const url = `${OPENSKY_URL}?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // OpenSky rate limit — return empty
      res.json({ states: [] });
      return;
    }

    const raw = await response.json() as { states: unknown[][] | null };

    // Normalize OpenSky array format to object format
    const states = (raw.states ?? []).map((s) => ({
      icao24: s[0],
      callsign: s[1],
      lat: s[6],
      lon: s[5],
      baro_altitude: s[7],
      true_track: s[10],
      velocity: s[9],
      on_ground: s[8],
    }));

    const data = { states };
    cache.set(key, data);
    res.json(data);
  } catch (err) {
    console.error('OpenSky fetch error:', err);
    res.json({ states: [] });
  }
});

export default router;

# ASTRA 7Timer Proxy

The frontend calls same-origin weather routes so browsers do not depend on upstream CORS behavior. This Worker validates inputs, proxies 7Timer and Open-Meteo, caches responses, and adds CORS headers.

Supported routes:

- `/api/astro` (7Timer, 30-minute cache)
- `/api/weather/forecast` (Open-Meteo, 5-minute cache)
- `/api/weather/geocoding` (Open-Meteo, 30-minute cache)

## Deploy

```powershell
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
```

Route the Worker at the same origin as the frontend, or set a reverse-proxy route for `/api/astro`. The frontend then keeps using `/api/astro` without exposing upstream details.

## Data mapping

The frontend maps 7Timer `seeing` categories 1–8 to representative arcseconds, and combines `transparency` with `cloudcover` into a 0–100 observation score. These are online forecast values, not instrument measurements.

const CACHE_TTL = 1800;

function corsHeaders(request, env) {
  const requested = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": allowed === "*" ? "*" : (requested === allowed ? requested : allowed),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(body, status, request, env, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env), ...extra }
  });
}

function coordinates(url) {
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return null;
  return { lat: lat.toFixed(4), lon: lon.toFixed(4) };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    if (!["/api/astro", "/api/weather/forecast", "/api/weather/geocoding"].includes(url.pathname)) return json({ error: "Not found" }, 404, request, env);
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, request, env);

    let upstreamUrl, source;
    if (url.pathname === "/api/astro") {
      const point = coordinates(url);
      if (!point) return json({ error: "Invalid latitude or longitude" }, 400, request, env);
      upstreamUrl = `https://www.7timer.info/bin/astro.php?lon=${point.lon}&lat=${point.lat}&ac=0&unit=metric&output=json&tzshift=0`;
      source = "7Timer";
    } else if (url.pathname === "/api/weather/forecast") {
      const latitude = Number(url.searchParams.get("latitude")), longitude = Number(url.searchParams.get("longitude"));
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return json({ error: "Invalid latitude or longitude" }, 400, request, env);
      const params = new URLSearchParams({ latitude: latitude.toFixed(5), longitude: longitude.toFixed(5), timezone: url.searchParams.get("timezone") || "auto", forecast_days: url.searchParams.get("forecast_days") || "7", hourly: url.searchParams.get("hourly") || "temperature_2m,relative_humidity_2m,cloud_cover,precipitation,visibility,wind_speed_10m" });
      upstreamUrl = `https://api.open-meteo.com/v1/forecast?${params}`;
      source = "Open-Meteo";
    } else {
      const name = (url.searchParams.get("name") || "").trim();
      if (!name || name.length > 120) return json({ error: "Invalid location name" }, 400, request, env);
      const params = new URLSearchParams({ name, count: url.searchParams.get("count") || "7", language: url.searchParams.get("language") || "zh", format: "json" });
      upstreamUrl = `https://geocoding-api.open-meteo.com/v1/search?${params}`;
      source = "Open-Meteo";
    }
    const cacheKey = new Request(upstreamUrl, { method: "GET" });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return new Response(cached.body, { status: cached.status, headers: { ...Object.fromEntries(cached.headers), ...corsHeaders(request, env) } });

    try {
      const upstream = await fetch(upstreamUrl, { headers: { Accept: "application/json" } });
      if (!upstream.ok) return json({ error: `7Timer HTTP ${upstream.status}` }, 502, request, env);
      const data = JSON.parse(await upstream.text());
      if (url.pathname === "/api/astro" && !Array.isArray(data.dataseries)) throw new Error("Invalid 7Timer payload");
      const response = json({ ...data, proxy: { source, fetchedAt: new Date().toISOString() } }, 200, request, env, { "Cache-Control": `public, max-age=${url.pathname === "/api/weather/forecast" ? 300 : CACHE_TTL}` });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      return json({ error: `${source} unavailable`, detail: error.message }, 502, request, env);
    }
  }
};

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const port = Number(process.argv[2] || process.env.PORT || 43117);
const cache = new Map();
const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".svg":"image/svg+xml", ".glb":"model/gltf-binary", ".woff2":"font/woff2" };

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Access-Control-Allow-Origin":"*", ...headers });
  res.end(JSON.stringify(body));
}

async function astroProxy(url, res, method) {
  if (method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET, OPTIONS" }); return res.end(); }
  const lat = Number(url.searchParams.get("lat")), lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) return sendJson(res, 400, { error:"Invalid latitude or longitude" });
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return sendJson(res, 200, hit.data, { "Cache-Control":"public, max-age=1800" });
  try {
    const upstreamUrl = `https://www.7timer.info/bin/astro.php?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}&ac=0&unit=metric&output=json&tzshift=0`;
    const response = await fetch(upstreamUrl, { signal:AbortSignal.timeout(12000), headers:{ Accept:"application/json" } });
    if (!response.ok) return sendJson(res, 502, { error:`7Timer HTTP ${response.status}` });
    const data = JSON.parse(await response.text());
    if (!Array.isArray(data.dataseries)) throw new Error("Invalid 7Timer payload");
    const payload = { ...data, proxy:{ source:"7Timer", latitude:lat, longitude:lon, fetchedAt:new Date().toISOString() } };
    cache.set(key, { data:payload, expires:Date.now()+1800000 });
    return sendJson(res, 200, payload, { "Cache-Control":"public, max-age=1800" });
  } catch (error) { return sendJson(res, 502, { error:"7Timer unavailable", detail:error.message }); }
}

async function openMeteoProxy(url, res, method, kind) {
  if (method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"GET, OPTIONS" }); return res.end(); }
  const upstream = kind === "forecast" ? "https://api.open-meteo.com/v1/forecast" : "https://geocoding-api.open-meteo.com/v1/search";
  const params = new URLSearchParams();
  if (kind === "forecast") {
    const latitude = Number(url.searchParams.get("latitude")), longitude = Number(url.searchParams.get("longitude"));
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return sendJson(res, 400, { error:"Invalid latitude or longitude" });
    params.set("latitude", latitude.toFixed(5)); params.set("longitude", longitude.toFixed(5));
    params.set("timezone", url.searchParams.get("timezone") || "auto");
    params.set("forecast_days", url.searchParams.get("forecast_days") || "7");
    params.set("hourly", url.searchParams.get("hourly") || "temperature_2m,relative_humidity_2m,cloud_cover,precipitation,visibility,wind_speed_10m");
  } else {
    const name = (url.searchParams.get("name") || "").trim();
    if (!name || name.length > 120) return sendJson(res, 400, { error:"Invalid location name" });
    params.set("name", name); params.set("count", url.searchParams.get("count") || "7"); params.set("language", url.searchParams.get("language") || "zh"); params.set("format", "json");
  }
  const cacheKey = `weather:${kind}:${params.toString()}`;
  const cacheHit = cache.get(cacheKey);
  if (cacheHit && cacheHit.expires > Date.now()) return sendJson(res, 200, cacheHit.data, { "Cache-Control":`public, max-age=${kind === "forecast" ? "300" : "3600"}` });
  try {
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try { response = await fetch(`${upstream}?${params}`, { signal:AbortSignal.timeout(12000), headers:{ Accept:"application/json" } }); break; }
      catch (error) { if (attempt === 1) throw error; await new Promise(resolve => setTimeout(resolve, 350)); }
    }
    if (!response.ok) return sendJson(res, 502, { error:`Open-Meteo HTTP ${response.status}` });
    const data = JSON.parse(await response.text());
    cache.set(cacheKey, { data, expires:Date.now() + (kind === "forecast" ? 300000 : 3600000) });
    return sendJson(res, 200, data, { "Cache-Control":`public, max-age=${kind === "forecast" ? "300" : "3600"}` });
  } catch (error) { return sendJson(res, 502, { error:"Open-Meteo unavailable", detail:error.message }); }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/astro") return astroProxy(url, res, req.method);
  if (url.pathname === "/api/weather/forecast") return openMeteoProxy(url, res, req.method, "forecast");
  if (url.pathname === "/api/weather/geocoding") return openMeteoProxy(url, res, req.method, "geocoding");
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error:"Method not allowed" });
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = resolve(normalize(join(root, requested)));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type":MIME[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control":"no-cache" });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
});

server.listen(port, "127.0.0.1", () => console.log(`ASTRA dev server: http://127.0.0.1:${port}`));

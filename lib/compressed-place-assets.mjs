// Lossless storage only. Public .json URLs retain ordinary JSON bytes and schema.
export const compressedPlacePaths = Object.freeze(['london','berlin','prague','limassol','paris','astana','tashkent','bishkek','minsk','baku','moscow','belgrade','yerevan'].flatMap(city => [`/${city}/places.json`, `/en/${city}/places.json`]).concat(['/places.json','/en/places.json']));
// Additional large, public data assets. No source files or records are removed.
export const compressedDataPaths = Object.freeze([
 '/events.json','/en/events.json','/moscow/events.json','/en/moscow/events.json',
 '/paris/events.json','/en/paris/events.json','/paris/paris-data-derived.json',
 '/vienna/places.json','/research/bars-2026-10-14/bar-registry.json',
 '/research/bars-2026-10-14/bars.json',
]);
export const compressedAssetPaths = Object.freeze([...compressedPlacePaths,...compressedDataPaths]);
const paths = new Set(compressedAssetPaths);
const legacyPaths = new Set(compressedPlacePaths);
export async function compressedPlaceResponse(request, assets) {
  const url = new URL(request.url);
  if (!['GET','HEAD'].includes(request.method) || !paths.has(url.pathname)) return null;
  if (!assets || typeof assets.fetch !== 'function') return new Response('Place data temporarily unavailable', {status:503,headers:{'Cache-Control':'no-store'}});
  url.pathname += '.gz';
  const packed = await assets.fetch(new Request(url.toString(), {method:request.method}));
  if (!packed.ok) return new Response('Place data temporarily unavailable', {status:503,headers:{'Cache-Control':'no-store'}});
  // Existing compressed-place policy remains unchanged. Newly compressed assets
  // inherit the hosting asset cache policy and validators instead of inventing TTLs.
  const headers = legacyPaths.has(new URL(request.url).pathname)
    ? new Headers({'Cache-Control':'public, max-age=60, must-revalidate'})
    : new Headers(packed.headers);
  headers.set('Content-Type','application/json; charset=utf-8');
  headers.set('X-Content-Type-Options','nosniff');
  for (const name of ['Content-Encoding','Content-Length','Content-Range','Accept-Ranges']) headers.delete(name);
  if (request.method === 'HEAD') return new Response(null,{status:200,headers});
  if (!packed.body) return new Response('Place data temporarily unavailable', {status:503,headers:{'Cache-Control':'no-store'}});
  // Stream rather than buffer a 16 MiB city dataset inside a Worker isolate.
  return new Response(packed.body.pipeThrough(new DecompressionStream('gzip')),{status:200,headers});
}

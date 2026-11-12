// Only the owner's GitHub Pages origin can use the existing FINDR relays.
// An Origin has no path: GitHub repositories under this account share it.
export const PAGES_ORIGIN = 'https://william2535.github.io';

export function isPagesOrigin(request) {
  return request.headers.get('origin') === PAGES_ORIGIN;
}

function vary(headers, fields) {
  const values = new Set((headers.get('vary') || '').split(',').map(value => value.trim()).filter(Boolean));
  for (const field of fields) values.add(field);
  headers.set('Vary', [...values].join(', '));
}

/** Decorate streamed success and error bodies without buffering their contents. */
export function withPagesCors(request, response, exposedHeaders = []) {
  const headers = new Headers(response.headers);
  vary(headers, ['Origin']);
  if (isPagesOrigin(request)) {
    headers.set('Access-Control-Allow-Origin', PAGES_ORIGIN);
    if (exposedHeaders.length) headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
  }
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

/** No cookies, owner credentials, arbitrary headers or third-party origins. */
export function pagesPreflight(request, {methods, headers: allowedHeaders}) {
  const requestedMethod = request.headers.get('access-control-request-method');
  const requestedHeaders = (request.headers.get('access-control-request-headers') || '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  const allowed = isPagesOrigin(request) && methods.includes(requestedMethod) &&
    requestedHeaders.every(value => allowedHeaders.includes(value));
  const headers = new Headers({'Cache-Control': 'private, no-store'});
  vary(headers, ['Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers']);
  if (!allowed) return new Response('Cross-origin request not supported.', {status: 403, headers});
  headers.set('Access-Control-Allow-Origin', PAGES_ORIGIN);
  headers.set('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
  if (requestedHeaders.length) headers.set('Access-Control-Allow-Headers', [...new Set(requestedHeaders)].join(', '));
  headers.set('Access-Control-Max-Age', '600');
  return new Response(null, {status: 204, headers});
}

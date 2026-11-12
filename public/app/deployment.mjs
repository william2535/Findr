import {API_ORIGIN} from './deployment-config.mjs';

export const FINDR_SERVER_ORIGIN = 'https://findr-fault-finder.floodyyy21.chatgpt.site';

/** One reviewed relay, or the current origin. No arbitrary URL forwarding. */
export function createAPIAddressing(origin = API_ORIGIN) {
  if (origin !== '' && origin !== FINDR_SERVER_ORIGIN) throw Error('Unsupported FINDR server profile.');
  return Object.freeze({
    endpoint(path) {
      if (typeof path !== 'string' || !/^\/api\/(?:manual\/[^/?#]+|assistant\/online)$/.test(path)) {
        throw Error('Unsupported FINDR API route.');
      }
      return origin + path;
    },
    responseOrigin(currentOrigin) { return origin || currentOrigin; },
    credentials: origin ? 'omit' : 'same-origin',
  });
}

export const apiAddressing = createAPIAddressing();

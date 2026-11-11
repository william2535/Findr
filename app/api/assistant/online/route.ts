import {handleOnlineAssistantRequest} from '../../../../lib/online-assistant.mjs';

// This route is intentionally stateless. The engineer's explicitly supplied key
// is used for this request only; no owner account or paid fallback is configured.
export const GET = (request: Request) => handleOnlineAssistantRequest(request);
export const POST = (request: Request) => handleOnlineAssistantRequest(request);

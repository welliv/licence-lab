// The protocol library uses Node's Buffer for a few hex/base64 helpers. In the browser we provide the same API.
import { Buffer } from 'buffer';
if (typeof (globalThis as any).Buffer === 'undefined') (globalThis as any).Buffer = Buffer;
export {};

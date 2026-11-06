export interface SseMessage { event: string; data: string }

function parseFrame(frame: string): SseMessage | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of frame.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const i = line.indexOf(':');
    const field = i < 0 ? line : line.slice(0, i);
    const value = i < 0 ? '' : line.slice(i + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  return data.length ? { event, data: data.join('\n') } : null;
}

/** Reads a Server-Sent Events response until it ends. Uses fetch, so an Authorization header can be sent. */
export async function readSse(res: Response, onMessage: (m: SseMessage) => void): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let i: number;
    while ((i = buffer.indexOf('\n\n')) >= 0) {
      const msg = parseFrame(buffer.slice(0, i));
      buffer = buffer.slice(i + 2);
      if (msg) onMessage(msg);
    }
  }
}

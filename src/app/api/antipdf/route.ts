import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type SessionRecord = {
  controllers: Set<ReadableStreamDefaultController>;
};

const globalStore = globalThis as unknown as {
  antipdfSignatureSessions?: Map<string, SessionRecord>;
};

const getStore = () => {
  if (!globalStore.antipdfSignatureSessions) {
    globalStore.antipdfSignatureSessions = new Map();
  }
  return globalStore.antipdfSignatureSessions;
};

const getSession = (sessionId: string) => {
  const store = getStore();
  let record = store.get(sessionId);
  if (!record) {
    record = { controllers: new Set() };
    store.set(sessionId, record);
  }
  return record;
};

const pushToSession = (sessionId: string, payload: unknown) => {
  const record = getSession(sessionId);
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  record.controllers.forEach((controller) => {
    try {
      controller.enqueue(data);
    } catch {
      // ignore
    }
  });
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  if (action !== 'stream') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  const sessionId = url.searchParams.get('session') || '';
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session' }, { status: 400 });
  }

  const record = getSession(sessionId);
  let streamController: ReadableStreamDefaultController | null = null;
  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      record.controllers.add(controller);
      controller.enqueue('event: ready\ndata: ok\n\n');
    },
    cancel() {
      if (streamController) {
        record.controllers.delete(streamController);
      }
    },
  });

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };

  return new Response(stream, { headers });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'session';

  if (action === 'session') {
    const sessionId = crypto.randomUUID().replace(/-/g, '');
    return NextResponse.json({ sessionId });
  }

  if (action === 'submit') {
    const body = await req.json().catch(() => null);
    const sessionId = body?.sessionId as string | undefined;
    const svg = body?.svg as string | undefined;
    if (!sessionId || !svg) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    pushToSession(sessionId, { type: 'signature', svg });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}

import http from 'http';
import next from 'next';
import { WebSocketServer } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const sessions = new Map();

const getSession = (id) => {
  if (!sessions.has(id)) {
    sessions.set(id, { desktop: null, mobile: null });
  }
  return sessions.get(id);
};

const sendToDesktop = (sessionId, payload) => {
  const session = getSession(sessionId);
  if (session.desktop && session.desktop.readyState === 1) {
    session.desktop.send(JSON.stringify(payload));
  }
};

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res));

  const wss = new WebSocketServer({ server, path: '/api/antipdf/ws' });

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('session');
      const role = url.searchParams.get('role');

      if (!sessionId || !role) {
        ws.close();
        return;
      }

      const session = getSession(sessionId);

      if (role === 'desktop') {
        if (session.desktop && session.desktop.readyState === 1) {
          session.desktop.close();
        }
        session.desktop = ws;
      } else if (role === 'mobile') {
        if (session.mobile && session.mobile.readyState === 1) {
          session.mobile.close();
        }
        session.mobile = ws;
      } else {
        ws.close();
        return;
      }

      ws.on('message', (data) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload?.type === 'signature' && typeof payload.svg === 'string') {
            sendToDesktop(sessionId, payload);
          }
        } catch {
          // ignore malformed payloads
        }
      });

      ws.on('close', () => {
        if (session.desktop === ws) session.desktop = null;
        if (session.mobile === ws) session.mobile = null;
        if (!session.desktop && !session.mobile) {
          sessions.delete(sessionId);
        }
      });
    } catch {
      ws.close();
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

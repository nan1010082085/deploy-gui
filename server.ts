import { createServer } from 'http';
import { parse } from 'url';
import { WebSocketServer } from 'ws';
import next from 'next';
import { getDb, type ServerRow } from './src/lib/db';
import { decrypt } from './src/lib/crypto';
import { Client } from 'ssh2';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // WebSocket server for terminal
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url!, true);
    if (pathname?.startsWith('/ws/terminal/')) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      // 让 Next.js 处理 HMR WebSocket
      handle(req, socket as any, undefined);
    }
  });

  wss.on('connection', (ws, req) => {
    const { pathname } = parse(req.url!, true);
    if (!pathname) return;

    // /ws/terminal/:serverId
    const match = pathname.match(/^\/ws\/terminal\/(\d+)$/);
    if (!match) {
      ws.close();
      return;
    }

    const serverId = parseInt(match[1], 10);
    const row = getDb().prepare('SELECT * FROM servers WHERE id = ?').get(serverId) as ServerRow | undefined;
    if (!row) {
      ws.send(JSON.stringify({ type: 'error', message: 'Server not found' }));
      ws.close();
      return;
    }

    const credential = decrypt(row.credential);
    const conn = new Client();
    const config: Record<string, unknown> = {
      host: row.host,
      port: row.port,
      username: row.username,
      readyTimeout: 10_000,
    };
    if (row.auth_type === 'key') config.privateKey = credential;
    else config.password = credential;

    let stream: any = null;

    conn.on('ready', () => {
      conn.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, s) => {
        if (err) {
          ws.send(JSON.stringify({ type: 'error', message: err.message }));
          ws.close();
          return;
        }
        stream = s;
        ws.send(JSON.stringify({ type: 'ready' }));

        // SSH -> WS
        s.on('data', (data: Buffer) => {
          ws.send(JSON.stringify({ type: 'output', data: data.toString('base64') }));
        });
        s.on('close', () => {
          ws.send(JSON.stringify({ type: 'closed' }));
          ws.close();
        });
      });
    });

    conn.on('error', (err) => {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
      ws.close();
    });

    // WS -> SSH
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!stream) return;
        if (msg.type === 'input') {
          stream.write(Buffer.from(msg.data, 'base64'));
        } else if (msg.type === 'resize') {
          stream.setWindow(msg.rows, msg.cols, 0, 0);
        }
      } catch { /* ignore */ }
    });

    ws.on('close', () => {
      if (stream) stream.end();
      conn.end();
    });

    conn.connect(config);
  });

  server.listen(port, () => {
    console.log(`> Deploy GUI on http://localhost:${port}`);
  });
});

import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { CollabService } from './collab.service';
import { toUint8 } from './helpers';
import { text } from 'stream/consumers';
import { timestamp } from 'rxjs';

type History = { timer: NodeJS.Timeout | null; records: EditHistoryRecord[] };

type Change = {
  type: 'insert' | 'delete';
  line: number;
  col: number;
  snippet: string;
};
type EditHistoryRecord = {
  userId: string;
  timestamp: number;
  changes: Change[];
};

type BurstBuffer = {
  timer: NodeJS.Timeout | null;
  startedAt: number; // when burst begun
  lastAt: number; // last record time
  lastLine: number | null; // to keep same-line bursts together
  records: EditHistoryRecord[];
};

const bursts = new Map<string, BurstBuffer>(); // key = `${sessionId}:${userId}`

const TYPE_BURST_MS = 1000; // pause threshold to “close” a burst
const MAX_BURST_MS = 5000; // safety cap: flush even if never paused

const historyBuffers = new Map<string, History>();

const ALLOWED_LANGUAGES = new Set(['python', 'javascript', 'java', 'cpp', 'c']);

function mergeRecords(records: EditHistoryRecord[]): EditHistoryRecord {
  const userId = records[0].userId;
  const timestamp = records[records.length - 1].timestamp;
  const all: Change[] = [];
  for (const r of records) all.push(...r.changes);
  const changes = combineChanges(all);
  return { userId, timestamp, changes };
}

function flushBurst(server: Server, sessionId: string, key: string) {
  const buffer = bursts.get(key);
  if (!buffer || buffer.records.length === 0) return;
  const merged = mergeRecords(buffer.records);
  server.to('session:' + sessionId).emit('collab:history:new', merged);
  // reset
  if (buffer.timer) clearTimeout(buffer.timer);
  bursts.delete(key);
}

function combineChanges(changes: Change[]): Change[] {
  if (!changes.length) return [];

  // Keep order as emitted
  const out: Change[] = [];
  let cur: Change | null = null;

  const pushCur = () => {
    if (cur) out.push({ ...cur });
  };

  for (const nxt of changes) {
    if (!cur) {
      cur = { ...nxt };
      continue;
    }

    const sameType = cur.type === nxt.type;
    const sameLine = cur.line === nxt.line;

    if (sameType && sameLine) {
      if (cur.type === 'insert') {
        // Merge if the next insert starts at or near the end of current snippet (typing forward)
        const curEnd = cur.col + cur.snippet.length;
        if (nxt.col <= curEnd + 5 && nxt.col >= cur.col - 1) {
          // If there is a small gap, fill with spaces so order stays correct
          const gap = Math.max(0, nxt.col - curEnd);
          if (gap > 0) cur.snippet += ' '.repeat(gap);
          cur.snippet += nxt.snippet;
          continue;
        }
      } else {
        // DELETE: merge if ranges touch or overlap, including backspace-left behavior
        const curStart = cur.col;
        const curEnd = cur.col + cur.snippet.length;

        const nxtStart = nxt.col;
        const nxtEnd = nxt.col + nxt.snippet.length;

        const touchingOrOverlapping = !(
          nxtStart > curEnd + 1 || nxtEnd < curStart - 1
        );

        if (touchingOrOverlapping) {
          // Expand to the union and rebuild snippet in correct order
          const newStart = Math.min(curStart, nxtStart);
          const leftFirst = nxtStart < curStart;

          cur.snippet = leftFirst
            ? nxt.snippet + cur.snippet
            : cur.snippet + nxt.snippet;
          cur.col = newStart;
          continue;
        }
      }
    }

    pushCur();
    cur = { ...nxt };
  }

  pushCur();

  // Combine multi-line pastes typed in one burst
  const final: Change[] = [];
  for (const ch of out) {
    const last = final[final.length - 1];
    if (
      last &&
      last.type === ch.type &&
      (last.line === ch.line || last.line + 1 === ch.line) &&
      last.snippet.endsWith('\n')
    ) {
      last.snippet += ch.snippet;
    } else {
      final.push(ch);
    }
  }
  return final;
}

@WebSocketGateway({ namespace: '/collab', transports: ['websocket'] })
export class CollabGateway {
  constructor(
    private readonly auth: AuthService,
    private readonly collab: CollabService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      // read token from handshake auth
      const token = (client.handshake.auth?.token as string) || null;
      // verify JWT
      const { userId } = this.auth.verify(token);

      const sessionId = (
        client.handshake.auth.sessionId as string | null
      ).trim();
      if (!sessionId) {
        client.emit('collab:error', {
          ok: false,
          message: 'No sessionId provided',
        });
        client.disconnect();
        return;
      }

      // attach userId and sessionId to socket
      client.data.userId = userId;
      client.data.sessionId = sessionId;

      // join room based on sessionId
      await client.join('session:' + sessionId);

      // send current doc state to the client
      const state = await this.collab.encodeCurrentState(sessionId);
      client.emit('collab:state', state);

      // send current language to the client
      const language = await this.collab.getLanguage(sessionId);
      client.emit('collab:language', { language });

      // small emit to confirm connection
      client.emit('collab:connected', { ok: true, userId, sessionId });
    } catch (error) {
      try {
        client.emit('collab:error', {
          ok: false,
          message: (error as Error).message,
        });
      } catch (error) {
        console.error('Error during WebSocket connection:', error);
      }
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const { userId, sessionId } = client.data;
    console.log(`User ${userId} disconnected from session ${sessionId}`);
  }

  @SubscribeMessage('collab:update')
  async handleStateUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() updateData: unknown,
  ) {
    const sessionId = client.data.sessionId as string;
    if (!sessionId) {
      return;
    }

    const update = toUint8(updateData);

    // apply to server doc
    const historyRecord = await this.collab.applyAndPersistUpdate(
      sessionId,
      update,
      client.data.userId,
    );

    // broadcast to other clients in the same session
    client.to('session:' + sessionId).emit('collab:update', update);

    if (historyRecord && historyRecord.changes.length > 0) {
      const key = `${sessionId}:${client.data.userId}`;
      const now = Date.now();
      const existing = bursts.get(key);

      if (!existing) {
        const timer = setTimeout(
          () => flushBurst(this.server, sessionId, key),
          TYPE_BURST_MS,
        );
        bursts.set(key, {
          timer,
          startedAt: now,
          lastAt: now,
          lastLine: historyRecord.changes[0]?.line ?? null,
          records: [historyRecord],
        });
      } else {
        const sameLine =
          existing.lastLine !== null &&
          historyRecord.changes.length &&
          historyRecord.changes[0].line === existing.lastLine;

        const withinBurst = now - existing.lastAt <= TYPE_BURST_MS;
        const withinMax = now - existing.startedAt <= MAX_BURST_MS;

        if (withinBurst && (sameLine || true) && withinMax) {
          // extend current burst
          existing.records.push(historyRecord);
          existing.lastAt = now;
          existing.lastLine =
            historyRecord.changes[0]?.line ?? existing.lastLine;
          if (existing.timer) clearTimeout(existing.timer);
          existing.timer = setTimeout(
            () => flushBurst(this.server, sessionId, key),
            TYPE_BURST_MS,
          );
        } else {
          // close old burst and start a new one
          flushBurst(this.server, sessionId, key);
          const timer = setTimeout(
            () => flushBurst(this.server, sessionId, key),
            TYPE_BURST_MS,
          );
          bursts.set(key, {
            timer,
            startedAt: now,
            lastAt: now,
            lastLine: historyRecord.changes[0]?.line ?? null,
            records: [historyRecord],
          });
        }
      }
    }
  }

  @SubscribeMessage('collab:history:get')
  async handleGetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { limit?: number },
  ) {
    const sessionId = client.data.sessionId as string;
    if (!sessionId) {
      return;
    }

    const limit = payload?.limit ?? 50;
    const history = await this.collab.getHistory(sessionId, limit);

    client.emit('collab:history', history);
  }

  @SubscribeMessage('collab:language:set')
  handleSetLanguage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { language: string },
  ) {
    const sessionId = client.data.sessionId as string;
    const language = body.language.toLowerCase();
    if (!sessionId || !ALLOWED_LANGUAGES.has(language)) {
      client.emit('collab:error', {
        ok: false,
        message: 'Invalid sessionId or unsupported language',
      });
      return;
    }
    this.collab.setLanguage(sessionId, language);

    client.to('session:' + sessionId).emit('collab:language', { language });
  }

  @SubscribeMessage('collab:revert')
  async handleRevert(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { timestamp: number },
  ) {
    const sessionId = client.data.sessionId as string;
    if (!sessionId) return;

    const text = await this.collab.getStateTextAt(sessionId, body.timestamp);
    const update = await this.collab.revertToText(
      sessionId,
      text,
      client.data.userId,
    );

    if (update && update.byteLength > 0) {
      this.server.to('session:' + sessionId).emit('collab:update', update);
    }

    const historyRecords: EditHistoryRecord[] = await this.collab.getHistory(
      sessionId,
      50,
    );
    this.server
      .to('session:' + sessionId)
      .emit('collab:history', historyRecords);
  }

  @SubscribeMessage('collab:awareness')
  handleAwarenessUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() awarenessData: unknown,
  ) {
    const sessionId = client.data.sessionId as string;
    if (!sessionId) {
      return;
    }

    const update = toUint8(awarenessData);

    client.to('session:' + sessionId).emit('collab:awareness', update);
  }

  @SubscribeMessage('collab:listAllRooms')
  async listAllRooms(@ConnectedSocket() client: Socket) {
    const sockets = await this.server.fetchSockets();

    const roomDetails: Record<string, string[]> = {};
    for (const socket of sockets) {
      for (const room of socket.rooms) {
        if (room === socket.id) continue; // skip individual socket room
        if (!roomDetails[room]) {
          roomDetails[room] = [];
        }
        roomDetails[room].push(socket.id);
      }
    }

    client.emit('collab:roomDetails', roomDetails);
  }
}

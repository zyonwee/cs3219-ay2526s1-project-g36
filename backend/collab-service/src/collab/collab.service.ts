import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { Injectable, Logger } from '@nestjs/common';
import { ClassicLevel } from 'classic-level';
import { time } from 'console';

export type SessionState = {
  doc: Y.Doc;
  awareness: Awareness;
  numberOfOperations: number;
  lastSnapshotAt: number;
  isLoadedFromDB: boolean;
  language: string;
};

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

const SNAPSHOT_PREFIX = 'snapshot:';
const UPDATE_PREFIX = 'update:';
const HISTORY_PREFIX = 'history:';

const SNAPSHOT_INTERVAL_MS = 30000; // 30 seconds
const OPERATIONS_THRESHOLD = 200;
const PRUNE_THRESHOLD_MS = 60000; // 1 minute
const MAX_SNIPPET_LENGTH = 120;

function updateKey(sessionId: string, timestamp: number) {
  const random = Math.random().toString(36).slice(2, 8);
  const paddedTimestamp = String(timestamp).padStart(13, '0');
  return `${UPDATE_PREFIX}${sessionId}:${paddedTimestamp}:${random}`;
}

function updateRange(sessionId: string) {
  const base = `${UPDATE_PREFIX}${sessionId}:`;
  return { gte: base, lt: base + '\xFF' };
}

function historyRange(sessionId: string, limit = 50) {
  const base = `${HISTORY_PREFIX}${sessionId}:`;
  return { gte: base, lt: base + '\xFF', reverse: true, limit: limit };
}

function findSnippetLocation(text: string, offset: number) {
  let line = 1,
    col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

@Injectable()
export class CollabService {
  private readonly log = new Logger('CollabService');

  private sessions = new Map<string, SessionState>();
  private db: ClassicLevel<string, Uint8Array>;

  constructor() {
    const path = process.env.COLLAB_SERVICE_PATH;
    // store uint8array values
    this.db = new ClassicLevel<string, Uint8Array>(path, {
      keyEncoding: 'utf-8',
      valueEncoding: 'view', // returns uint8array
    });
  }

  private newSession(): SessionState {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    return {
      doc,
      awareness,
      numberOfOperations: 0,
      lastSnapshotAt: Date.now(),
      isLoadedFromDB: false,
      language: 'python',
    };
  }

  async setLanguage(sessionId: string, language: string) {
    const session = await this.getOrLoadSession(sessionId);
    session.language = language;
  }

  async getLanguage(sessionId: string): Promise<string> {
    const session = await this.getOrLoadSession(sessionId);
    return session.language;
  }

  async getOrLoadSession(sessionId: string): Promise<SessionState> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.newSession();
      this.sessions.set(sessionId, session);
    }
    if (!session.isLoadedFromDB) {
      await this.loadSessionFromDB(sessionId, session);
      session.isLoadedFromDB = true;
    }
    return session;
  }

  async loadSessionFromDB(sessionId: string, session: SessionState) {
    // load latest snapshot
    try {
      const snapshotKey = SNAPSHOT_PREFIX + sessionId;
      const snapshot = await this.db.get(snapshotKey);
      if (snapshot && snapshot.byteLength > 0) {
        Y.applyUpdate(session.doc, snapshot);
        this.log.log(`Loaded snapshot for session ${sessionId}`);
      }
    } catch (error) {
      this.log.error(
        `Failed to load snapshot for session ${sessionId}: ${error}`,
      );
    }
    // check latest updates
    for await (const [key, val] of this.db.iterator(updateRange(sessionId))) {
      try {
        Y.applyUpdate(session.doc, val);
      } catch (error) {
        this.log.error(
          `Failed to apply update ${key} for session ${sessionId}: ${error}`,
        );
      }
    }
  }

  encodeCurrentState(sessionId: string): Promise<Uint8Array> {
    // return Y.encodeStateAsUpdate(this.getOrCreateSession(sessionId).doc);
    return this.getOrLoadSession(sessionId).then((session) =>
      Y.encodeStateAsUpdate(session.doc),
    );
  }

  async applyAndPersistUpdate(
    sessionId: string,
    update: Uint8Array,
    userId: string,
  ) {
    const session = await this.getOrLoadSession(sessionId);
    const currentText = session.doc.getText('content');
    let historyRecord: EditHistoryRecord | null = null;
    const now = Date.now();

    const beforeUpdateText = currentText.toString();
    let change: Array<any> | null = null;

    // Observe changes to capture the diff when this update is applied
    const capture = (event: Y.YTextEvent) => {
      change = event.delta as Array<any>;
    };
    currentText.observe(capture);
    try {
      Y.applyUpdate(session.doc, update);
    } finally {
      currentText.unobserve(capture);
    }

    // Append update to the database
    const key = updateKey(sessionId, now);
    await this.db.put(key, update);

    // Record edit history if we captured a change
    if (change) {
      const changes: Change[] = [];
      let offset = 0;
      for (const operation of change) {
        if (operation.retain) {
          offset += operation.retain;
        } else if (typeof operation.insert === 'string') {
          const snippet = operation.insert.slice(0, MAX_SNIPPET_LENGTH);
          const { line, col } = findSnippetLocation(beforeUpdateText, offset);
          changes.push({
            type: 'insert',
            line,
            col,
            snippet,
          });
        } else if (operation.delete) {
          const removed = beforeUpdateText
            .slice(offset, offset + operation.delete)
            .slice(0, MAX_SNIPPET_LENGTH); // get snippet of deleted text
          const { line, col } = findSnippetLocation(beforeUpdateText, offset);
          changes.push({
            type: 'delete',
            line,
            col,
            snippet: removed,
          });
          offset += operation.delete;
        }
      }

      const historyKey = `${HISTORY_PREFIX}${sessionId}:${now}:${Math.random().toString(36).slice(2, 8)}`;
      historyRecord = {
        userId,
        timestamp: now,
        changes,
      };
      await this.db.put(
        historyKey,
        new TextEncoder().encode(JSON.stringify(historyRecord)),
      );
    }

    session.numberOfOperations++;
    const shouldSnapshot =
      session.numberOfOperations >= OPERATIONS_THRESHOLD ||
      now - session.lastSnapshotAt >= SNAPSHOT_INTERVAL_MS;

    if (shouldSnapshot) {
      await this.writeSnapshotToDb(sessionId, session);
      session.numberOfOperations = 0;
      session.lastSnapshotAt = now;
      await this.pruneOldUpdates(sessionId, now - PRUNE_THRESHOLD_MS);
    }

    return historyRecord;
  }

  async writeSnapshotToDb(sessionId: string, session: SessionState) {
    const state = Y.encodeStateAsUpdate(session.doc);
    await this.db.put(SNAPSHOT_PREFIX + sessionId, state);
    this.log.log(`Wrote snapshot for session ${sessionId}`);
  }

  async pruneOldUpdates(sessionId: string, thresholdTimestamp: number) {
    const toDelete: string[] = [];
    for await (const [key] of this.db.iterator(updateRange(sessionId))) {
      const parts = key.split(':');
      const timestampString = parts[2];
      const timestamp = Number(timestampString);
      if (timestamp < thresholdTimestamp) {
        toDelete.push(key);
      }
    }

    if (toDelete.length) {
      const batch = this.db.batch();
      for (const delKey of toDelete) {
        batch.del(delKey);
      }
      await batch.write();
      this.log.log(
        `Pruned ${toDelete.length} old updates for session ${sessionId}`,
      );
    }
  }

  async getHistory(
    sessionId: string,
    limit: number = 50,
  ): Promise<EditHistoryRecord[]> {
    const history: EditHistoryRecord[] = [];
    for await (const [_, val] of this.db.iterator(
      historyRange(sessionId, limit),
    )) {
      try {
        history.push(JSON.parse(new TextDecoder().decode(val)));
      } catch (error) {
        this.log.error(
          `Failed to parse history record for session ${sessionId}: ${error}`,
        );
      }
    }
    return history;
  }

  getAwareness(sessionId: string): Promise<Awareness> {
    return this.getOrLoadSession(sessionId).then(
      (session) => session.awareness,
    );
  }
}

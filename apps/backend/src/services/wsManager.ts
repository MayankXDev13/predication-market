import { WebSocket, WebSocketServer } from "ws";
import type { Server } from "http";

/**
 * Channel-based WebSocket manager.
 *
 * Channels:
 *   market:<id>   — orderbook updates, market status changes
 *   user:<id>     — balance updates, position updates
 */
export class WsManager {
  private wss: WebSocketServer;
  private channels = new Map<string, Set<WebSocket>>();
  private wsMeta = new Map<WebSocket, Set<string>>(); // reverse lookup

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (ws) => {
      this.wsMeta.set(ws, new Set());

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "subscribe" && msg.channel) {
            this.subscribe(ws, msg.channel);
          } else if (msg.type === "unsubscribe" && msg.channel) {
            this.unsubscribe(ws, msg.channel);
          }
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on("close", () => {
        const channels = this.wsMeta.get(ws);
        if (channels) {
          for (const channel of channels) {
            this.channels.get(channel)?.delete(ws);
          }
        }
        this.wsMeta.delete(ws);
      });
    });
  }

  subscribe(ws: WebSocket, channel: string) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(ws);
    this.wsMeta.get(ws)?.add(channel);
  }

  unsubscribe(ws: WebSocket, channel: string) {
    this.channels.get(channel)?.delete(ws);
    this.wsMeta.get(ws)?.delete(channel);
  }

  /** Broadcast a message to all subscribers of a channel. */
  broadcast(channel: string, message: object) {
    const subscribers = this.channels.get(channel);
    if (!subscribers || subscribers.size === 0) return;

    const data = JSON.stringify(message);
    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  /** Broadcast to all subscribers of multiple channels at once. */
  broadcastMany(channels: string[], message: object) {
    for (const channel of channels) {
      this.broadcast(channel, message);
    }
  }
}

import type { WsManager } from "./services/wsManager";

/**
 * Global application context, set during server bootstrap.
 * Allows services (orderService, marketService) to broadcast via WebSocket
 * without circular import dependencies.
 */
export let wsManager: WsManager;

export function setWsManager(mgr: WsManager) {
  wsManager = mgr;
}

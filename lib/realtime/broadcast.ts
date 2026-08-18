/**
 * lib/realtime/broadcast.ts
 *
 * Real-time event broadcaster for console real-time synchronization.
 * Uses Node EventEmitter singleton to bridge server-side mutations with SSE streams.
 */

import { EventEmitter } from 'events'

// Global singleton across server invocations in development and production
declare global {
   
  var __realtimeBroadcaster: EventEmitter | undefined
}

if (!global.__realtimeBroadcaster) {
  global.__realtimeBroadcaster = new EventEmitter()
  global.__realtimeBroadcaster.setMaxListeners(200)
}

export const realtimeBroadcaster = global.__realtimeBroadcaster

export type ConsoleRealtimeEvent =
  | { type: 'application:created'; data: { id: string; publicId: string; stage: string; jobTitle?: string | null | undefined } }
  | { type: 'application:stage_updated'; data: { id: string; stage: string; actorId?: string | null | undefined } }
  | { type: 'application:note_added'; data: { id: string; noteId: string } }
  | { type: 'pipeline:invalidate'; data?: Record<string, unknown> }

export function broadcastConsoleEvent(event: ConsoleRealtimeEvent) {
  try {
    realtimeBroadcaster.emit('console:event', event)
  } catch (err) {
    console.error('Failed to broadcast console event:', err)
  }
}

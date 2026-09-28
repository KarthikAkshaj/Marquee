/**
 * The room's light (U14): posters say which colour they'd like the room to
 * take while the pointer is on them, and RoomLight listens. A tiny store, so
 * a hover never re-renders anything but the light itself.
 */
type Listener = (tint: string | null) => void;

const listeners = new Set<Listener>();
let current: string | null = null;

/** Light the room in a colour, or null to hand it back to the page's own light. */
export function lightRoom(tint: string | null) {
  if (tint === current) return;
  current = tint;
  for (const listener of listeners) listener(tint);
}

export function onRoomLight(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

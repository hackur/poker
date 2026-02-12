// ============================================================
// Chat Manager — Message store, friend management, reactions
// Uses globalThis singleton to survive HMR and module boundaries
// Edge runtime compatible
// ============================================================

export interface ChatMessage {
  id: string;
  tableId: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
  reactions: Record<string, string[]>; // emoji -> playerIds
  type: 'message' | 'reaction' | 'system';
}

export interface FriendEntry {
  friendId: string;
  friendName: string;
  addedAt: number;
}

export interface PlayerProfile {
  playerId: string;
  playerName: string;
  friends: FriendEntry[];
  lastSeen: number;
  online: boolean;
}

export const QUICK_REACTIONS = [
  { emoji: '👍', label: 'nice hand' },
  { emoji: '🎉', label: 'gg' },
  { emoji: '😢', label: 'unlucky' },
  { emoji: '🔥', label: 'on fire' },
  { emoji: '😂', label: 'lol' },
  { emoji: '🤔', label: 'hmm' },
] as const;

// ---- globalThis stores ----

const MSG_KEY = '__pokerChatMessages__';
const PROFILE_KEY = '__pokerPlayerProfiles__';

function messageStore(): Map<string, ChatMessage[]> {
  const g = globalThis as Record<string, unknown>;
  if (!(g[MSG_KEY] instanceof Map)) g[MSG_KEY] = new Map<string, ChatMessage[]>();
  return g[MSG_KEY] as Map<string, ChatMessage[]>;
}

function profileStore(): Map<string, PlayerProfile> {
  const g = globalThis as Record<string, unknown>;
  if (!(g[PROFILE_KEY] instanceof Map)) g[PROFILE_KEY] = new Map<string, PlayerProfile>();
  return g[PROFILE_KEY] as Map<string, PlayerProfile>;
}

// ---- ID generation (edge-safe) ----

let counter = 0;
function genId(): string {
  return `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---- Messages ----

export function getMessages(tableId: string, since?: number): ChatMessage[] {
  const msgs = messageStore().get(tableId) ?? [];
  if (since) return msgs.filter(m => m.timestamp > since);
  return msgs;
}

export function addMessage(tableId: string, playerId: string, playerName: string, content: string): ChatMessage {
  const store = messageStore();
  const msgs = store.get(tableId) ?? [];
  const msg: ChatMessage = {
    id: genId(),
    tableId,
    playerId,
    playerName,
    content,
    timestamp: Date.now(),
    reactions: {},
    type: 'message',
  };
  msgs.push(msg);
  // Keep last 200 messages per table
  if (msgs.length > 200) msgs.splice(0, msgs.length - 200);
  store.set(tableId, msgs);
  return msg;
}

export function addSystemMessage(tableId: string, content: string): ChatMessage {
  const store = messageStore();
  const msgs = store.get(tableId) ?? [];
  const msg: ChatMessage = {
    id: genId(),
    tableId,
    playerId: 'system',
    playerName: 'System',
    content,
    timestamp: Date.now(),
    reactions: {},
    type: 'system',
  };
  msgs.push(msg);
  if (msgs.length > 200) msgs.splice(0, msgs.length - 200);
  store.set(tableId, msgs);
  return msg;
}

export function addReaction(tableId: string, messageId: string, emoji: string, playerId: string): boolean {
  const msgs = messageStore().get(tableId) ?? [];
  const msg = msgs.find(m => m.id === messageId);
  if (!msg) return false;
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  if (!msg.reactions[emoji].includes(playerId)) {
    msg.reactions[emoji].push(playerId);
  }
  return true;
}

export function removeReaction(tableId: string, messageId: string, emoji: string, playerId: string): boolean {
  const msgs = messageStore().get(tableId) ?? [];
  const msg = msgs.find(m => m.id === messageId);
  if (!msg || !msg.reactions[emoji]) return false;
  msg.reactions[emoji] = msg.reactions[emoji].filter(id => id !== playerId);
  if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  return true;
}

// ---- Player Profiles ----

export function getOrCreateProfile(playerId: string, playerName: string): PlayerProfile {
  const store = profileStore();
  let profile = store.get(playerId);
  if (!profile) {
    profile = {
      playerId,
      playerName,
      friends: [],
      lastSeen: Date.now(),
      online: true,
    };
    store.set(playerId, profile);
  }
  profile.playerName = playerName;
  profile.lastSeen = Date.now();
  profile.online = true;
  return profile;
}

export function getProfile(playerId: string): PlayerProfile | undefined {
  return profileStore().get(playerId);
}

export function setOnline(playerId: string, online: boolean): void {
  const profile = profileStore().get(playerId);
  if (profile) {
    profile.online = online;
    profile.lastSeen = Date.now();
  }
}

// ---- Friends ----

export function addFriend(playerId: string, friendId: string, friendName: string): boolean {
  const profile = profileStore().get(playerId);
  if (!profile) return false;
  if (profile.friends.some(f => f.friendId === friendId)) return false;
  profile.friends.push({ friendId, friendName, addedAt: Date.now() });
  return true;
}

export function removeFriend(playerId: string, friendId: string): boolean {
  const profile = profileStore().get(playerId);
  if (!profile) return false;
  const before = profile.friends.length;
  profile.friends = profile.friends.filter(f => f.friendId !== friendId);
  return profile.friends.length < before;
}

export function getFriends(playerId: string): FriendEntry[] {
  return profileStore().get(playerId)?.friends ?? [];
}

export function getFriendsWithStatus(playerId: string): (FriendEntry & { online: boolean })[] {
  const friends = getFriends(playerId);
  return friends.map(f => ({
    ...f,
    online: profileStore().get(f.friendId)?.online ?? false,
  }));
}

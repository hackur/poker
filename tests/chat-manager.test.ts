import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMessages,
  addMessage,
  addSystemMessage,
  addReaction,
  removeReaction,
  getOrCreateProfile,
  getProfile,
  addFriend,
  removeFriend,
  getFriends,
  getFriendsWithStatus,
  setOnline,
  QUICK_REACTIONS,
} from '@/lib/chat-manager';

// Reset globalThis stores between tests
beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g['__pokerChatMessages__'];
  delete g['__pokerPlayerProfiles__'];
});

describe('Chat Messages', () => {
  it('adds and retrieves messages', () => {
    const msg = addMessage('table-1', 'p1', 'Alice', 'Hello!');
    expect(msg.content).toBe('Hello!');
    expect(msg.tableId).toBe('table-1');
    expect(msg.type).toBe('message');

    const msgs = getMessages('table-1');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].id).toBe(msg.id);
  });

  it('filters by since timestamp', () => {
    addMessage('t1', 'p1', 'A', 'first');
    const beforeSecond = Date.now() - 1;
    const m2 = addMessage('t1', 'p1', 'A', 'second');
    // Use a timestamp just before m2
    const filtered = getMessages('t1', beforeSecond);
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.some(m => m.id === m2.id)).toBe(true);
  });

  it('adds system messages', () => {
    const msg = addSystemMessage('t1', 'Player joined');
    expect(msg.type).toBe('system');
    expect(msg.playerId).toBe('system');
  });

  it('limits to 200 messages per table', () => {
    for (let i = 0; i < 210; i++) {
      addMessage('t1', 'p1', 'A', `msg ${i}`);
    }
    expect(getMessages('t1')).toHaveLength(200);
  });

  it('isolates tables', () => {
    addMessage('t1', 'p1', 'A', 'hello');
    addMessage('t2', 'p1', 'A', 'world');
    expect(getMessages('t1')).toHaveLength(1);
    expect(getMessages('t2')).toHaveLength(1);
  });
});

describe('Reactions', () => {
  it('adds and removes reactions', () => {
    const msg = addMessage('t1', 'p1', 'A', 'nice');
    expect(addReaction('t1', msg.id, '👍', 'p2')).toBe(true);
    
    const msgs = getMessages('t1');
    expect(msgs[0].reactions['👍']).toEqual(['p2']);

    expect(removeReaction('t1', msg.id, '👍', 'p2')).toBe(true);
    expect(msgs[0].reactions['👍']).toBeUndefined();
  });

  it('prevents duplicate reactions', () => {
    const msg = addMessage('t1', 'p1', 'A', 'nice');
    addReaction('t1', msg.id, '👍', 'p2');
    addReaction('t1', msg.id, '👍', 'p2');
    expect(getMessages('t1')[0].reactions['👍']).toHaveLength(1);
  });

  it('returns false for missing message', () => {
    expect(addReaction('t1', 'fake-id', '👍', 'p1')).toBe(false);
  });
});

describe('Player Profiles & Friends', () => {
  it('creates profiles', () => {
    const profile = getOrCreateProfile('p1', 'Alice');
    expect(profile.playerId).toBe('p1');
    expect(profile.online).toBe(true);
    expect(getProfile('p1')).toBeDefined();
  });

  it('manages friends', () => {
    getOrCreateProfile('p1', 'Alice');
    getOrCreateProfile('p2', 'Bob');

    expect(addFriend('p1', 'p2', 'Bob')).toBe(true);
    expect(addFriend('p1', 'p2', 'Bob')).toBe(false); // duplicate
    expect(getFriends('p1')).toHaveLength(1);

    expect(removeFriend('p1', 'p2')).toBe(true);
    expect(getFriends('p1')).toHaveLength(0);
  });

  it('shows online status in friends list', () => {
    getOrCreateProfile('p1', 'Alice');
    getOrCreateProfile('p2', 'Bob');
    addFriend('p1', 'p2', 'Bob');

    let friends = getFriendsWithStatus('p1');
    expect(friends[0].online).toBe(true);

    setOnline('p2', false);
    friends = getFriendsWithStatus('p1');
    expect(friends[0].online).toBe(false);
  });
});

describe('QUICK_REACTIONS constant', () => {
  it('has expected reactions', () => {
    expect(QUICK_REACTIONS.length).toBeGreaterThanOrEqual(5);
    expect(QUICK_REACTIONS[0]).toHaveProperty('emoji');
    expect(QUICK_REACTIONS[0]).toHaveProperty('label');
  });
});

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@/lib/chat-manager';
import { QUICK_REACTIONS } from '@/lib/chat-manager';

// ============================================================
// Chat Panel — Table chat with polling, reactions, quick msgs
// ============================================================

interface ChatPanelProps {
  tableId: string;
  playerId: string;
  playerName: string;
  isOpen: boolean;
  onToggle: () => void;
}

const POLL_INTERVAL = 1000;
const PRESETS = ['Nice hand! 👍', 'GG 🎉', 'Unlucky 😢', 'Wow! 🔥', 'LOL 😂'];

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Audio not available
  }
}

export function ChatPanel({ tableId, playerId, playerName, isOpen, onToggle }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const lastTimestampRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Poll for messages
  const fetchMessages = useCallback(async () => {
    try {
      const url = `/api/v1/chat/messages?tableId=${tableId}&since=${lastTimestampRef.current}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages(prev => {
          const existing = new Set(prev.map(m => m.id));
          const newMsgs = data.messages.filter((m: ChatMessage) => !existing.has(m.id));
          if (newMsgs.length === 0) return prev;
          return [...prev, ...newMsgs].slice(-200);
        });
        lastTimestampRef.current = data.timestamp;
      }
    } catch {
      /* retry */
    }
  }, [tableId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Notification sound + unread count
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const newOnes = messages.slice(prevCountRef.current);
      const fromOthers = newOnes.some(m => m.playerId !== playerId);
      if (fromOthers) {
        if (!isOpen) setUnread(u => u + newOnes.filter(m => m.playerId !== playerId).length);
        playNotificationSound();
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, isOpen, playerId]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Clear unread when opened
  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    await fetch('/api/v1/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, playerId, playerName, content: content.trim() }),
    });
    setInput('');
    fetchMessages();
  };

  const sendReaction = async (messageId: string, emoji: string) => {
    await fetch('/api/v1/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, messageId, emoji, playerId }),
    });
    setShowReactions(null);
    fetchMessages();
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-colors"
        aria-label="Toggle chat"
      >
        💬
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-4 z-50 w-80 h-96 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Table Chat</span>
              <button onClick={onToggle} className="text-gray-400 hover:text-white text-lg">×</button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {messages.length === 0 && (
                <p className="text-gray-500 text-xs text-center mt-8">No messages yet. Say hi!</p>
              )}
              <AnimatePresence initial={false}>
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`text-xs ${msg.type === 'system' ? 'text-gray-500 italic text-center' : ''}`}
                  >
                    {msg.type !== 'system' && (
                      <div
                        className="group relative cursor-pointer"
                        onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                      >
                        <span className={`font-semibold ${msg.playerId === playerId ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {msg.playerName}
                        </span>
                        <span className="text-gray-300 ml-1">{msg.content}</span>
                        {/* Reactions */}
                        {Object.keys(msg.reactions).length > 0 && (
                          <div className="flex gap-1 mt-0.5">
                            {Object.entries(msg.reactions).map(([emoji, ids]) => (
                              <span key={emoji} className="bg-gray-800 rounded px-1 text-[10px]">
                                {emoji} {ids.length}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Reaction picker */}
                        <AnimatePresence>
                          {showReactions === msg.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="absolute bottom-full left-0 mb-1 bg-gray-800 rounded-lg px-2 py-1 flex gap-1 z-10"
                            >
                              {QUICK_REACTIONS.map(r => (
                                <button
                                  key={r.emoji}
                                  onClick={(e) => { e.stopPropagation(); sendReaction(msg.id, r.emoji); }}
                                  className="hover:scale-125 transition-transform text-sm"
                                  title={r.label}
                                >
                                  {r.emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {msg.type === 'system' && <span>{msg.content}</span>}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Quick presets */}
            <div className="px-3 py-1 flex gap-1 overflow-x-auto border-t border-gray-800">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full px-2 py-0.5 whitespace-nowrap transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(input); }}
              className="px-3 py-2 border-t border-gray-700 flex gap-2"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={500}
                className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs rounded-lg px-3 py-1.5 transition-colors"
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

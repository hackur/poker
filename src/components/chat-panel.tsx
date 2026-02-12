'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/hooks/useMediaQuery';

// ============================================================
// Chat Panel — Collapsible on mobile
// ============================================================

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface ChatPanelProps {
  tableId: string;
  playerId?: string;
  playerName?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function ChatPanel({ tableId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track unread when closed on mobile
  useEffect(() => {
    if (isMobile && !isOpen && messages.length > 0) {
      setUnreadCount((c) => c + 1);
    }
  }, [messages.length, isMobile, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'You', text: input.trim(), timestamp: Date.now() },
    ]);
    setInput('');
  };

  // Mobile: floating toggle button + slide-up panel
  if (isMobile) {
    return (
      <>
        {/* Toggle button */}
        {!isOpen && (
          <motion.button
            className="chat-toggle fixed bottom-20 right-3 z-40 w-12 h-12 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center shadow-lg"
            onClick={handleOpen}
            whileTap={{ scale: 0.9 }}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <span className="text-lg">💬</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}

        {/* Slide-up panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="chat-panel chat-open fixed bottom-0 left-0 right-0 z-50 h-[50dvh] bg-gray-900 border-t border-gray-700 rounded-t-2xl flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <span className="text-white font-semibold text-sm">Chat</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 text-xl"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  ×
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
                {messages.length === 0 && (
                  <p className="text-gray-600 text-xs text-center py-8">No messages yet</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className="text-xs">
                    <span className="text-emerald-400 font-medium">{msg.sender}: </span>
                    <span className="text-gray-300">{msg.text}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 p-3 border-t border-gray-800">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-emerald-500 outline-none"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSend}
                  className="px-4 bg-emerald-600 text-white rounded-lg font-medium text-sm"
                  style={{ minHeight: '44px' }}
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop: sidebar panel (placeholder - existing behavior)
  return null;
}

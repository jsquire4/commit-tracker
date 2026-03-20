/**
 * AIChatSidebar — Full-height sticky sidebar for AI chat.
 * Shared between Briefing and Portfolio pages.
 *
 * Header: "Compass Intelligence" label.
 * Scrollable chat area with ChatBubble messages.
 * Input field with send button at bottom.
 * "Powered by AI" footer.
 */
import { useRef, useEffect, useState, type KeyboardEvent } from 'react';
import { useAIChat, type ChatMessage } from '@/hooks/useAIChat';
import { ChatBubble } from './ChatBubble';

interface AIChatSidebarProps {
  /** Optional context hint for stub responses */
  context?: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Footer text */
  footerText?: string;
  /** Optional initial messages to seed the conversation */
  initialMessages?: ChatMessage[];
}

export function AIChatSidebar({
  context,
  placeholder = 'Ask about the data...',
  footerText = 'Powered by AI \u00B7 Based on current cycle data',
  initialMessages,
}: AIChatSidebarProps) {
  const { messages, isLoading, sendMessage } = useAIChat(context);
  const [inputValue, setInputValue] = useState('');
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine initial + live messages
  const allMessages = initialMessages
    ? [...initialMessages, ...messages]
    : messages;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = conversationRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [allMessages.length]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-surface-lowest rounded-sm h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-outline-variant">
        <svg className="w-[18px] h-[18px] text-accent flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13zm-.75-9.25a.75.75 0 011.5 0v3.5a.75.75 0 01-.75.75h-2a.75.75 0 010-1.5h1.25V7.25z" />
        </svg>
        <span className="text-body font-medium text-on-surface">Compass Intelligence</span>
      </div>

      {/* Conversation */}
      <div
        ref={conversationRef}
        className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 scrollbar-thin"
      >
        {allMessages.length === 0 && !isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[0.8125rem] text-muted text-center px-4">
              Ask a question about your data to get started.
            </p>
          </div>
        )}
        {allMessages.map((msg, i) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            animationDelay={i < (initialMessages?.length ?? 0) ? i * 100 : 0}
          />
        ))}
        {isLoading && (
          <div className="self-start max-w-[92%] px-4 py-3 rounded-sm bg-surface-lowest border border-outline-variant">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-outline-variant">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="flex-1 border-0 border-b border-b-outline-variant/15 bg-transparent text-[0.8125rem] text-on-surface py-2 outline-none focus:border-b-accent transition-colors placeholder:text-muted"
            style={{ transitionDuration: 'var(--duration-fast, 150ms)' }}
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="w-8 h-8 rounded-sm bg-accent text-white border-none cursor-pointer flex items-center justify-center flex-shrink-0 transition-colors hover:bg-accent-dark active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ transitionDuration: 'var(--duration-fast, 150ms)' }}
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3.105 2.29a1 1 0 011.307-.376l13 6.5a1 1 0 010 1.79l-13 6.5A1 1 0 013 15.882V11l7-1-7-1V4.118a1 1 0 01.105-1.828z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-2 px-5 text-[0.6875rem] text-muted">
        {footerText}
      </div>
    </div>
  );
}

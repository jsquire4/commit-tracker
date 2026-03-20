/**
 * ChatBubble — Message bubble for AI chat sidebar.
 * User messages: right-aligned, subtle accent bg.
 * AI messages: left-aligned, white bg with border.
 * Fade-in entrance animation.
 */
import type { ChatMessage } from '@/hooks/useAIChat';

interface ChatBubbleProps {
  message: ChatMessage;
  animationDelay?: number;
}

export function ChatBubble({ message, animationDelay = 0 }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  const time = new Date(message.timestamp);
  const timeLabel = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div
      className={[
        'max-w-[92%] rounded-sm animate-fade-up',
        isUser ? 'self-end' : 'self-start',
      ].join(' ')}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div
        className={[
          'px-4 py-3 rounded-sm text-[0.8125rem] leading-[1.6]',
          isUser
            ? 'bg-surface-container-low text-on-surface'
            : 'bg-surface-lowest text-on-surface-variant border border-outline-variant',
        ].join(' ')}
      >
        {message.text}
      </div>
      <div
        className={[
          'mt-1 text-[0.6875rem] text-muted',
          isUser ? 'text-right' : 'text-left',
        ].join(' ')}
      >
        {timeLabel}
      </div>
    </div>
  );
}

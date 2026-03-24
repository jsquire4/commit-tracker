import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/api/client';
import type { ApiResponse } from '@/types/api.types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatApiResponse {
  content: string;
  timestamp: string;
}

export function useAIChat(_context?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const nextIdRef = useRef(1);
  const cancelledRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  const sendMessage = useCallback(async (text: string): Promise<string> => {
    const userMsg: ChatMessage = {
      id: `msg-${nextIdRef.current++}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build conversation history for the API (use ref to avoid stale closure)
      const apiMessages: ChatApiMessage[] = [
        ...messagesRef.current.map((m) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text,
        })),
        { role: 'user' as const, content: text },
      ];

      const response = await apiClient.post<ApiResponse<ChatApiResponse>>(
        '/api/v1/briefing/chat',
        { messages: apiMessages },
        { timeout: 30000 }, // LLM calls can take longer than the default 15s
      );

      if (cancelledRef.current) return '';

      const responseText = response.data.data.content;
      const aiMsg: ChatMessage = {
        id: `msg-${nextIdRef.current++}`,
        role: 'ai',
        text: responseText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      return responseText;
    } catch (err) {
      if (cancelledRef.current) return '';

      const errorText = err instanceof Error
        ? `Sorry, I couldn't process that request. ${err.message}`
        : 'Sorry, an unexpected error occurred. Please try again.';

      const errorMsg: ChatMessage = {
        id: `msg-${nextIdRef.current++}`,
        role: 'ai',
        text: errorText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMsg]);
      return errorText;
    } finally {
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}

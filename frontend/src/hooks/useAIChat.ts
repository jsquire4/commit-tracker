import { useState, useCallback, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
}

/** Stub response generator — keyword-based for now, ready for API integration. */
function generateStubResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('alignment')) {
    return 'Strategic alignment across the portfolio is currently averaging 47%. Meridian Manufacturing leads at 41% with a slight declining trend, while Apex Dynamics has dropped to 28% over the past 4 weeks\u2009\u2014\u2009the most significant drift in the portfolio. Cascade Logistics shows promise at 55% but has only 2 weeks of data.';
  }

  if (lower.includes('coverage')) {
    return 'Rally cry coverage varies significantly across the portfolio. Meridian has the strongest coverage at 88%, though their Churn Reduction initiative has a critical gap with only 1 linked commitment. Apex Dynamics is weakest at 62% with their Revenue Diversification rally cry showing zero commitments. Cascade Logistics is at 74% and improving.';
  }

  if (lower.includes('drift') || lower.includes('risk')) {
    return 'There are 4 active drift signals in the portfolio. Apex Dynamics accounts for 3 of them: sustained alignment decline, emerging velocity drop, and sustained coverage decline. Meridian has 2 emerging alignment drift signals across 2 teams. Cascade Logistics has insufficient data for drift analysis at only 2 weeks in.';
  }

  if (lower.includes('carry') || lower.includes('forward')) {
    return 'Portfolio-wide carry-forward rate is 19%. Apex Dynamics is the primary driver at 32%\u2009\u2014\u2009nearly 1 in 3 commitments carried forward each week. Meridian is at 18%, slightly above target. Cascade Logistics is healthy at just 8%. The rising carry-forward at Apex suggests structural capacity issues that need attention.';
  }

  if (lower.includes('apex')) {
    return 'Apex Dynamics is the primary concern in the portfolio. Strategic alignment has dropped 12 points over 4 weeks to 28%, carry-forward rate hit 32%, and they have 3 active drift signals. Their Revenue Diversification rally cry has zero commitments\u2009\u2014\u2009no one is working on it. I\u2019d recommend a management review focused on capacity and strategic prioritization.';
  }

  if (lower.includes('meridian')) {
    return 'Meridian Manufacturing is generally on track but has two areas of concern: their Churn Reduction rally cry has only 1 commitment (a coverage gap), and alignment has dipped slightly from recent weeks. Their strong coverage (88%) and reasonable completion rate (72%) are positive indicators. The 2 emerging drift signals in their sub-teams should be monitored.';
  }

  if (lower.includes('cascade')) {
    return 'Cascade Logistics is in early deployment (Week 2) and showing strong initial signals: 55% strategic alignment, 85% completion rate, and only 8% carry-forward. However, with just 2 weeks of data, it\u2019s too early to establish trends or detect drift. All current indicators are positive but should be monitored over the next 2\u20133 weeks.';
  }

  return 'I can help you analyze portfolio performance, alignment trends, coverage gaps, drift signals, and carry-forward patterns. Try asking about a specific company or metric for detailed insights.';
}

export function useAIChat(context?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const nextIdRef = useRef(1);
  const cancelledRef = useRef(false);

  // Reset cancelled flag on mount, set on unmount
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

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));

    if (cancelledRef.current) return '';

    const responseText = generateStubResponse(text);
    const aiMsg: ChatMessage = {
      id: `msg-${nextIdRef.current++}`,
      role: 'ai',
      text: responseText,
      timestamp: new Date().toISOString(),
    };

    if (cancelledRef.current) return responseText;

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);

    return responseText;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  void context; // reserved for future API context parameter

  return { messages, isLoading, sendMessage, clearMessages };
}

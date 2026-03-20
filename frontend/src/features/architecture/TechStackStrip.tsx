import { useRef } from 'react';
import { useFadeUp } from '@/hooks/useMotion';

interface StackCard {
  label: string;
  tech: string[];
}

const STACK_CARDS: StackCard[] = [
  {
    label: 'Backend',
    tech: ['Java 21', 'Spring Boot 3', 'Spring Data JPA'],
  },
  {
    label: 'Frontend',
    tech: ['React 18', 'TypeScript (strict)', 'Vite \u00b7 TanStack Query'],
  },
  {
    label: 'Database',
    tech: ['PostgreSQL 15', 'Flyway Migrations', 'Partial Indexes'],
  },
  {
    label: 'Infrastructure',
    tech: ['Docker', 'Railway', 'Structured JSON Logging'],
  },
  {
    label: 'AI Layer',
    tech: ['LLM Integration', 'Narrative Briefings', 'Conversational Analytics'],
  },
];

function StackCardItem({ card, index }: { card: StackCard; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useFadeUp(ref);

  return (
    <div
      ref={ref}
      className="reveal rounded bg-surface-lowest p-5 transition-colors duration-150"
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className="label-caps text-accent font-semibold mb-2">
        {card.label}
      </div>
      <div className="text-small text-on-surface-variant leading-relaxed">
        {card.tech.map((line, i) => (
          <span key={i}>
            {line}
            {i < card.tech.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TechStackStrip() {
  return (
    <div className="grid grid-cols-5 gap-4 max-[960px]:grid-cols-3 max-[640px]:grid-cols-2">
      {STACK_CARDS.map((card, i) => (
        <StackCardItem key={card.label} card={card} index={i} />
      ))}
    </div>
  );
}

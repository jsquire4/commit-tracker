import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  definition: string;
  title?: string;
}

let mermaidInitialized = false;
let diagramCounter = 0;

async function initMermaid() {
  if (mermaidInitialized) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    themeVariables: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      primaryColor: '#036A6A',
      primaryBorderColor: '#036A6A',
      primaryTextColor: '#2D3432',
      lineColor: '#94A3B8',
      secondaryColor: '#F2F4F2',
      tertiaryColor: '#EEEEEC',
      noteBkgColor: '#F9F9F7',
      noteTextColor: '#5A605E',
      noteBorderColor: '#E8E5E0',
    },
  });
  mermaidInitialized = true;
}

export function MermaidDiagram({ definition, title }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++diagramCounter}`);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        await initMermaid();
        const { default: mermaid } = await import('mermaid');

        // Use a unique ID per render to avoid mermaid ID collisions
        const renderId = `${idRef.current}-${Date.now()}`;

        try {
          const { svg: rendered } = await mermaid.render(renderId, definition);
          if (!cancelled) {
            setSvg(rendered);
            setError(null);
          }
        } catch (renderErr) {
          if (!cancelled) {
            setError(renderErr instanceof Error ? renderErr.message : 'Failed to render diagram');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      }
    }

    void render();
    return () => { cancelled = true; };
  }, [definition]);

  return (
    <div className="rounded bg-surface-lowest p-8 overflow-x-auto">
      {title != null && (
        <h3 className="font-serif text-[1.0625rem] text-on-surface mb-4">{title}</h3>
      )}
      {error != null ? (
        <p className="text-small text-error">Diagram rendering failed: {error}</p>
      ) : svg ? (
        <div
          ref={containerRef}
          className="flex justify-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex justify-center py-8">
          <div className="shimmer h-48 w-full max-w-xl rounded" />
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';

export function ArchitectureNav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-outline-variant bg-surface-lowest/85 backdrop-blur-[20px]">
      <div className="mx-auto max-w-[1280px] px-8">
        <div className="flex h-14 items-center justify-between">
          <Link
            to="/"
            className="font-serif text-[1.25rem] text-on-surface no-underline"
            style={{ fontVariant: 'small-caps', letterSpacing: '0.08em' }}
          >
            compass
          </Link>
          <span className="text-body font-medium text-on-surface-variant">
            Architecture Overview
          </span>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="link-underline text-small text-navy"
            >
              &larr; Back to App
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

import type { ReactNode } from "react";

export function LinkIcon({ children }: { children: ReactNode }) {
  return (
    <svg className="link-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

export function CardsIcon() {
  return (
    <LinkIcon>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </LinkIcon>
  );
}

export function ListIcon() {
  return (
    <LinkIcon>
      <path d="M9 6h12M9 12h12M9 18h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </LinkIcon>
  );
}

export function FamiliesIcon() {
  return (
    <LinkIcon>
      <rect x="3.5" y="4" width="5" height="16" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7h8.5M12 12h8.5M12 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </LinkIcon>
  );
}

export function AlphabetIcon() {
  return (
    <svg className="alphabet-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5H22V7H12M12 19V17H22V19M12 11H22V13H12M9 13V15L5.67 19H9V21H3V19L6.33 15H3V13M7 3H5C3.9 3 3 3.9 3 5V11H5V9H7V11H9V5C9 3.9 8.11 3 7 3M7 7H5V5H7Z"
      />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <LinkIcon>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </LinkIcon>
  );
}

export function BackIcon() {
  return (
    <LinkIcon>
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m12 19-7-7 7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </LinkIcon>
  );
}

export function TipIcon() {
  return (
    <LinkIcon>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11.2v5.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </LinkIcon>
  );
}

export function CopyIcon() {
  return (
    <svg className="link-icon copy-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function CopiedIcon() {
  return (
    <svg className="link-icon copied-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EbirdIcon() {
  return (
    <LinkIcon>
      <path d="M16 7h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m20 7 2 .5-2 .5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18v3M14 17.75V21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 18a6 6 0 0 0 3.84-10.61" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </LinkIcon>
  );
}

export function WikipediaIcon() {
  return (
    <svg className="link-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.6 16.4 8.7 7.8h1.2l2.1 6.4 2.1-6.4h1.2l2.1 8.6"
      />
    </svg>
  );
}

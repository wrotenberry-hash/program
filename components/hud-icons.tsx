import type { ComponentProps, ReactNode } from "react";

/*
 * Solid glyphs for the round HUD buttons, Last War style: a pale white-to-blue
 * face with darker cut-in details, read at a glance on a dark round button.
 */
type P = ComponentProps<"svg"> & { size?: number };
const FACE = "url(#hud-face)";
const CUT = "#3d4f7a";

function Glyph({ size = 30, children, ...p }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...p}>
      <defs>
        <linearGradient id="hud-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9cff3" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

export function HudHammer(p: P) {
  return (
    <Glyph {...p}>
      <g transform="rotate(-40 16 16)">
        <rect x="14" y="11" width="4.5" height="18" rx="2.2" fill={FACE} />
        <rect x="7" y="4" width="18" height="8" rx="2.5" fill={FACE} />
        <rect x="7" y="9.5" width="18" height="2.5" fill={CUT} opacity="0.35" />
      </g>
    </Glyph>
  );
}

export function HudClipboard(p: P) {
  return (
    <Glyph {...p}>
      <rect x="6" y="6" width="20" height="23" rx="3" fill={FACE} />
      <rect x="11" y="3" width="10" height="6" rx="2" fill={FACE} stroke={CUT} strokeOpacity="0.5" strokeWidth="1.2" />
      <circle cx="11.5" cy="16" r="2" fill="none" stroke={CUT} strokeWidth="2" />
      <path d="M15 21 L20 15 M20 15 h-3.2 M20 15 v3.2" stroke={CUT} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M10 24 l2.5-2.5 M12.5 24 L10 21.5" stroke={CUT} strokeWidth="2" strokeLinecap="round" />
    </Glyph>
  );
}

export function HudGift(p: P) {
  return (
    <Glyph {...p}>
      <ellipse cx="11.5" cy="8.5" rx="4.5" ry="3.2" fill={FACE} transform="rotate(-20 11.5 8.5)" />
      <ellipse cx="20.5" cy="8.5" rx="4.5" ry="3.2" fill={FACE} transform="rotate(20 20.5 8.5)" />
      <rect x="6" y="15" width="20" height="14" rx="2" fill={FACE} />
      <rect x="4" y="10.5" width="24" height="6" rx="2" fill={FACE} />
      <rect x="14" y="10.5" width="4" height="18.5" fill={CUT} opacity="0.4" />
    </Glyph>
  );
}

export function HudTrophy(p: P) {
  return (
    <Glyph {...p}>
      <path d="M9.5 9 H6 c0 5 2 7 5 7.5 M22.5 9 H26 c0 5 -2 7 -5 7.5" stroke="#d6e3fa" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M9 4.5 H23 V12 C23 17 20 20.5 16 20.5 C12 20.5 9 17 9 12 Z" fill={FACE} />
      <rect x="14.3" y="20" width="3.4" height="4.5" fill={FACE} />
      <rect x="9.5" y="24" width="13" height="4.5" rx="1.6" fill={FACE} />
      <path d="M16 8 l1.3 2.7 3 .4 -2.2 2.1 .5 3 -2.6-1.4 -2.6 1.4 .5-3 -2.2-2.1 3-.4 Z" fill={CUT} opacity="0.45" />
    </Glyph>
  );
}

export function HudHelmet(p: P) {
  return (
    <Glyph {...p}>
      <path d="M4.5 18 C4.5 9.5 11 4.5 18 4.5 C24 4.5 27.5 9 27.5 14 V16.5 H20.5 L18.5 22.5 L10 25 C6.5 24.5 4.5 21.5 4.5 18 Z" fill={FACE} />
      <circle cx="13" cy="15.5" r="2.4" fill={CUT} opacity="0.55" />
      <path d="M19.5 16.5 H29 M20.5 21 H28.5 M24.5 14.5 V24.5 M28.5 16.5 C29.5 19 29.5 22 28 24.5 H22" stroke="#d6e3fa" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M8 11 C10 8 13 6.5 16 6.2" stroke="#ffffff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.9" />
    </Glyph>
  );
}

export function HudShield(p: P) {
  return (
    <Glyph {...p}>
      <path d="M16 3 L27 7 V15 C27 22 22 27 16 29.5 C10 27 5 22 5 15 V7 Z" fill={FACE} />
      <path d="M16 9.5 l2 4.1 4.5 .6 -3.3 3.1 .8 4.5 -4-2.2 -4 2.2 .8-4.5 -3.3-3.1 4.5-.6 Z" fill={CUT} opacity="0.5" />
    </Glyph>
  );
}

export function HudFlag(p: P) {
  return (
    <Glyph {...p}>
      <rect x="5.5" y="3.5" width="3" height="26" rx="1.5" fill={FACE} />
      <path d="M9 5 C14 2.5 18 8 27 4.5 V17 C18 20.5 14 15 9 17.5 Z" fill={FACE} />
      <path d="M17 8.5 l1.2 2.4 2.7 .4 -2 1.9 .5 2.7 -2.4-1.3 -2.4 1.3 .5-2.7 -2-1.9 2.7-.4 Z" fill={CUT} opacity="0.5" />
    </Glyph>
  );
}

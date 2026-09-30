import type { ComponentProps } from "react";

/* Single-color inline SVG icons (docs/design.md). Color comes from currentColor. */
type P = ComponentProps<"svg"> & { size?: number };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export function Coin({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" opacity="0.25" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v9M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </svg>
  );
}
export function Bolt({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="none" opacity="0.3" />
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}
export function Shield({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z" fill="currentColor" stroke="none" opacity="0.25" />
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z" />
    </svg>
  );
}
export function Hammer({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M14 4 20 10l-2 2-6-6 2-2zM12 8l-8 8 2 2 8-8" />
    </svg>
  );
}
export function Trophy({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" fill="currentColor" stroke="none" opacity="0.25" />
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6" />
    </svg>
  );
}
export function Chat({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 5h16v10H9l-5 4V5z" fill="currentColor" stroke="none" opacity="0.25" />
      <path d="M4 5h16v10H9l-5 4V5z" />
    </svg>
  );
}
export function Check({ size = 20, ...p }: P) {
  return (
    <svg {...base(size)} {...p}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

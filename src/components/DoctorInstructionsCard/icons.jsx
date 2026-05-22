/**
 * icons.jsx — hand-crafted inline SVG icons for the Doctor's Notepad.
 *
 * All icons: 24×24 viewBox, stroke-only (fill: none), stroke="currentColor",
 * round caps/joins. `size` and `strokeWidth` are props.
 */

function Svg({ size = 16, strokeWidth = 1.8, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ---- Header ---------------------------------------------------------- */

export function IconPencil(props) {
  return (
    <Svg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}
export function IconMaximize(props) {
  return (
    <Svg {...props}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </Svg>
  );
}
export function IconMinimize(props) {
  return (
    <Svg {...props}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </Svg>
  );
}
export function IconMoreVertical(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}
export function IconSave(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </Svg>
  );
}

/* ---- Toolbar (strokeWidth 2) ----------------------------------------- */

export function IconUndo(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </Svg>
  );
}
export function IconRedo(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </Svg>
  );
}
export function IconListBullet(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}
export function IconListOrdered(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <line x1="10" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="10" y1="18" x2="20" y2="18" />
      <path d="M4 4.5h1.5V9" strokeWidth={1.6} />
      <path d="M3.2 15.2c0-1 1.6-1 1.6 0 0 .8-1.6 1.4-1.6 2.8H5" strokeWidth={1.6} />
    </Svg>
  );
}
export function IconAlignLeft(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <line x1="3" y1="6" x2="18" y2="6" />
      <line x1="3" y1="12" x2="13" y2="12" />
      <line x1="3" y1="18" x2="18" y2="18" />
    </Svg>
  );
}
export function IconAlignCenter(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="5" y1="18" x2="19" y2="18" />
    </Svg>
  );
}
export function IconAlignRight(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <line x1="6" y1="6" x2="21" y2="6" />
      <line x1="11" y1="12" x2="21" y2="12" />
      <line x1="6" y1="18" x2="21" y2="18" />
    </Svg>
  );
}
export function IconClearFormat(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M4 7V4h16v3" />
      <path d="M5 20h7" />
      <path d="M13 4 8 20" />
      <path d="m15 14 6 6" />
      <path d="m21 14-6 6" />
    </Svg>
  );
}

/* ---- Slash command icons (strokeWidth 2) ----------------------------- */

export function IconHeading(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M6 4v16" />
      <path d="M18 4v16" />
      <path d="M6 12h12" />
    </Svg>
  );
}
export function IconPill(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </Svg>
  );
}
export function IconClipboard(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </Svg>
  );
}
export function IconFile(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </Svg>
  );
}
export function IconActivity(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Svg>
  );
}
export function IconFlask(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L4.6 19a1.5 1.5 0 0 0 1.3 2.3h12.2a1.5 1.5 0 0 0 1.3-2.3L14 9.5V3" />
      <path d="M7.5 14h9" />
    </Svg>
  );
}
export function IconSyringe(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="M19 9 9 19a2.1 2.1 0 0 1-3 0l-1-1a2.1 2.1 0 0 1 0-3L14 5" />
      <path d="m9 11 3 3" />
      <path d="m5 19-3 3" />
    </Svg>
  );
}
export function IconCalendar(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  );
}
export function IconMinus(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

/* ---- Status / misc --------------------------------------------------- */

export function IconCheck(props) {
  return (
    <Svg strokeWidth={2.5} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}
export function IconSpinner(props) {
  return (
    <svg
      width={props.size || 14}
      height={props.size || 14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className="np-spinner"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  );
}
export function IconKeyboard(props) {
  return (
    <Svg strokeWidth={1.8} {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </Svg>
  );
}
export function IconClose(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  );
}

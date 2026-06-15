/* Stroke-style icons for the Capacities-style page shell. 18px default. */

const base = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const IcoSidebar = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
  </svg>
);

export const IcoChevronDown = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const IcoGrid = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const IcoMonitor = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export const IcoList = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3.5" cy="6" r="1" />
    <circle cx="3.5" cy="12" r="1" />
    <circle cx="3.5" cy="18" r="1" />
  </svg>
);

export const IcoCheckCircle = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="8.5 12 11 14.5 15.5 9.5" />
  </svg>
);

export const IcoPaperclip = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7L13 5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
  </svg>
);

export const IcoSearch = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
);

export const IcoDots = ({ size = 18 }: { size?: number }) => (
  <svg {...base(size)}>
    <circle cx="5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="19" cy="12" r="1.4" />
  </svg>
);

export const IcoFolder = ({ size = 20 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </svg>
);

export const IcoDocPlus = ({ size = 20 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <polyline points="14 3 14 8 19 8" />
    <line x1="12" y1="12" x2="12" y2="17" />
    <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" />
  </svg>
);

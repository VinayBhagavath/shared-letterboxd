// Lightweight inline SVG icons - no extra dependency.
// Each icon accepts `className` and `size` (defaults to 1em / inherit color).

function base(size, props) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  };
}

export const ArrowUp = ({ size = 18, className = '' }) => (
  <svg {...base(size, { className })}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </svg>
);

export const Check = ({ size = 18, className = '' }) => (
  <svg {...base(size, { className })}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const Eye = ({ size = 18, className = '' }) => (
  <svg {...base(size, { className })}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const MessageCircle = ({ size = 18, className = '' }) => (
  <svg {...base(size, { className })}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export const Plus = ({ size = 18, className = '' }) => (
  <svg {...base(size, { className })}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const X = ({ size = 18, className = '' }) => (
  <svg {...base(size, { className })}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export const Search = ({ size = 18, className = '' }) => (
  <svg {...base(size, { className })}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const Trash = ({ size = 18, className = '' }) => (
  <svg {...base(size, { className })}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

export const Film = ({ size = 18, className = '' }) => (
  <svg {...base(size, { className })}>
    <rect x="2" y="2" width="20" height="20" rx="2.5" />
    <path d="M7 2v20" />
    <path d="M17 2v20" />
    <path d="M2 12h20" />
    <path d="M2 7h5" />
    <path d="M2 17h5" />
    <path d="M17 7h5" />
    <path d="M17 17h5" />
  </svg>
);

export const ExternalLink = ({ size = 14, className = '' }) => (
  <svg {...base(size, { className })}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </svg>
);

export const Edit = ({ size = 14, className = '' }) => (
  <svg {...base(size, { className })}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

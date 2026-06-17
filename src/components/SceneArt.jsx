import { useId } from 'react';

// SceneArt - an elegant, deterministic stand-in for a not-yet-uploaded photo.
// Instead of a blank diagonal-stripe box, each empty image slot renders a
// branded aviation motif in the squadron's navy + gold language. The motif is
// chosen by a stable hash of the slot/label, so a given tile always looks the
// same and a grid of tiles shows a cohesive, intentional mix.

const MOTIFS = ['formation', 'horizon', 'compass', 'radar', 'wings', 'contour'];

function hashStr(s = '') {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// A compact top-down plane glyph, drawn around its own origin.
function Plane({ x, y, s = 1, lead = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M0 -10 L2.4 -3.5 L11 -1 L11 2 L3 1 L1.6 7 L4.2 9.5 L4.2 11 L-4.2 11 L-4.2 9.5 L-1.6 7 L-3 1 L-11 2 L-11 -1 L-2.4 -3.5 Z"
        fill={lead ? '#fff' : 'var(--gold)'}
      />
    </g>
  );
}

function Formation() {
  return (
    <g>
      <path
        className="sa-trail"
        d="M160 70 L160 196 M118 110 L160 196 M202 110 L160 196 M82 150 L160 196 M238 150 L160 196"
        fill="none"
        stroke="rgba(255,255,255,.22)"
        strokeWidth="1.5"
        strokeDasharray="3 6"
      />
      <Plane x={160} y={66} s={1.15} lead />
      <Plane x={118} y={106} />
      <Plane x={202} y={106} />
      <Plane x={82} y={146} s={0.85} />
      <Plane x={238} y={146} s={0.85} />
    </g>
  );
}

function Horizon() {
  return (
    <g>
      <circle cx="160" cy="186" r="62" fill="var(--gold)" opacity="0.9" />
      <circle cx="160" cy="186" r="62" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
      <line x1="0" y1="186" x2="320" y2="186" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
      {[120, 150, 168].map((y, i) => (
        <line
          key={i}
          x1={20 + i * 30}
          y1={y}
          x2={120 + i * 26}
          y2={y}
          stroke="rgba(255,255,255,.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      <g transform="translate(214 96) rotate(18) scale(1.7)">
        <Plane x={0} y={0} lead />
      </g>
    </g>
  );
}

function Compass() {
  return (
    <g transform="translate(160 160)">
      <circle r="92" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" />
      <circle r="74" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.7" />
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="0" y1="0" x2="0" y2="-74"
          stroke="rgba(255,255,255,.18)"
          strokeWidth="1"
          transform={`rotate(${i * 45})`}
        />
      ))}
      <path d="M0 -64 L13 0 L0 64 L-13 0 Z" fill="none" stroke="var(--gold)" strokeWidth="2" />
      <path d="M0 -64 L13 0 L0 0 Z" fill="var(--gold)" />
      <path d="M0 64 L-13 0 L0 0 Z" fill="rgba(255,255,255,.85)" />
      <circle r="4" fill="#fff" />
      <text x="0" y="-82" textAnchor="middle" fill="rgba(255,255,255,.7)" fontFamily="'JetBrains Mono', monospace" fontSize="13" fontWeight="600">N</text>
    </g>
  );
}

function Radar() {
  return (
    <g transform="translate(160 162)">
      <defs>
        <linearGradient id="sa-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[34, 60, 86].map((r) => (
        <circle key={r} r={r} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1" />
      ))}
      <line x1="-92" y1="0" x2="92" y2="0" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <line x1="0" y1="-92" x2="0" y2="92" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
      <path d="M0 0 L86 0 A86 86 0 0 0 60 -62 Z" fill="url(#sa-sweep)" />
      <line x1="0" y1="0" x2="60" y2="-62" stroke="var(--gold)" strokeWidth="1.5" />
      <circle cx="44" cy="-20" r="3.5" fill="var(--gold)" />
      <circle cx="-30" cy="34" r="3" fill="rgba(255,255,255,.8)" />
      <circle cx="22" cy="58" r="2.5" fill="var(--gold)" />
    </g>
  );
}

function Wings() {
  return (
    <g transform="translate(160 158)">
      {[1, -1].map((dir) => (
        <g key={dir} transform={`scale(${dir} 1)`}>
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M14 ${-14 + i * 9} q ${52 - i * 6} ${-2 - i} ${94 - i * 14} ${10 + i * 4}`}
              fill="none"
              stroke="var(--gold)"
              strokeWidth={2 - i * 0.2}
              strokeLinecap="round"
              opacity={0.92 - i * 0.16}
            />
          ))}
        </g>
      ))}
      <circle r="17" fill="var(--navy)" stroke="var(--gold)" strokeWidth="2" />
      <circle r="7" fill="var(--gold)" />
      <path d="M0 -40 L9 -16 L-9 -16 Z" fill="rgba(255,255,255,.85)" />
    </g>
  );
}

function Contour() {
  const rings = [
    'M40 196 C 70 150 110 150 150 168 C 196 188 250 168 286 132',
    'M30 222 C 80 188 120 192 168 206 C 220 220 262 204 300 176',
    'M44 168 C 84 132 116 134 156 146 C 198 158 240 142 280 110',
  ];
  return (
    <g>
      {rings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity={0.5 - i * 0.12} />
      ))}
      <path d="M150 70 L176 124 L124 124 Z" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" />
      <path d="M150 70 L176 124 L150 124 Z" fill="var(--gold)" opacity="0.85" />
      <path
        d="M60 96 C 110 110 150 96 196 116 C 232 132 262 118 286 92"
        fill="none"
        stroke="rgba(255,255,255,.5)"
        strokeWidth="1.5"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <circle cx="60" cy="96" r="3.5" fill="var(--gold)" />
      <circle cx="286" cy="92" r="3.5" fill="#fff" />
    </g>
  );
}

const RENDER = {
  formation: Formation,
  horizon: Horizon,
  compass: Compass,
  radar: Radar,
  wings: Wings,
  contour: Contour,
};

// Derive up-to-two initials from a name like "Capt. M. Cormier" -> "MC".
function toInitials(name = '') {
  const parts = name
    .replace(/\b(capt|lt|2lt|ci|cwo|f\/sgt|sgt|maj|wo|po|col)\.?\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = parts.map((p) => p.replace(/[^A-Za-zÀ-ÿ]/g, '')[0]).filter(Boolean);
  return (letters[0] || '') + (letters[letters.length - 1] || '');
}

// A dignified roster avatar: navy gradient disc, large monogram, faint wing
// motif - used for staff before a real portrait is uploaded.
export function InitialsAvatar({ name = '', label = '', className }) {
  const uid = useId().replace(/:/g, '');
  const initials = (toInitials(name) || label.slice(0, 2) || '').toUpperCase();
  return (
    <svg
      className={['sa', className].filter(Boolean).join(' ')}
      viewBox="0 0 320 320"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={name || label || undefined}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="var(--navy-2)" />
          <stop offset="1" stopColor="var(--navy)" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.28" r="0.7">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="320" fill={`url(#${uid}-bg)`} />
      <rect width="320" height="320" fill={`url(#${uid}-glow)`} />
      <g opacity="0.5" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" fill="none">
        {[1, -1].map((dir) => (
          <g key={dir} transform={`translate(160 250) scale(${dir} 1)`}>
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M10 ${i * 8} q 40 ${-2 - i} 78 ${8 + i * 3}`} opacity={0.8 - i * 0.22} />
            ))}
          </g>
        ))}
      </g>
      <text
        x="160" y="158" textAnchor="middle" dominantBaseline="central"
        fontFamily="'Schibsted Grotesk', sans-serif" fontWeight="800" fontSize="118"
        letterSpacing="-4" fill="#fff" opacity="0.94"
      >{initials || '★'}</text>
    </svg>
  );
}

export function SceneArt({ label = '', seed, className }) {
  const uid = useId().replace(/:/g, '');
  const key = seed != null ? String(seed) : label || 'scene';
  const h = hashStr(key);
  const motif = MOTIFS[h % MOTIFS.length];
  const Motif = RENDER[motif];
  // Nudge the glow to a different corner per tile so neighbours differ.
  const glowX = 0.25 + ((h >> 3) % 3) * 0.25;
  const glowY = 0.2 + ((h >> 5) % 2) * 0.18;

  return (
    <svg
      className={['sa', className].filter(Boolean).join(' ')}
      viewBox="0 0 320 320"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="var(--navy)" />
          <stop offset="1" stopColor="var(--navy-2)" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx={glowX} cy={glowY} r="0.85">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.26" />
          <stop offset="0.55" stopColor="var(--gold)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="320" fill={`url(#${uid}-bg)`} />
      <g stroke="rgba(255,255,255,.05)" strokeWidth="1">
        {[40, 80, 120, 160, 200, 240, 280].map((p) => (
          <line key={`v${p}`} x1={p} y1="0" x2={p} y2="320" />
        ))}
        {[40, 80, 120, 160, 200, 240, 280].map((p) => (
          <line key={`h${p}`} x1="0" y1={p} x2="320" y2={p} />
        ))}
      </g>
      <rect width="320" height="320" fill={`url(#${uid}-glow)`} />
      <Motif />
    </svg>
  );
}

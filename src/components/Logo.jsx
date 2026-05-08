export function Logo({ size = 40 }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="var(--primary)" />
      <path d="M20 6 L34 18 L31 18 L20 9 L9 18 L6 18 Z" fill="var(--accent)" />
      <path d="M6 22 H34 M6 26 H34 M6 30 H34" stroke="var(--accent)" strokeWidth="1.2" opacity=".4" />
      <text
        x="20" y="29" textAnchor="middle"
        fontFamily="Schibsted Grotesk, sans-serif"
        fontSize="9" fontWeight="800" fill="#fff"
        letterSpacing="-.02em"
      >763</text>
    </svg>
  );
}

// Row brand mark: navy rounded square with three rising bands (navy / orange / navy).
export default function BrandLogo({ className = 'w-11 h-11' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Row logo">
      <rect x="2" y="2" width="44" height="44" rx="9" fill="#ffffff" stroke="#002046" strokeWidth="3" />
      <g strokeLinejoin="round" strokeWidth="1.5">
        <polygon points="12,16 36,9 36,15 12,22" fill="#002046" stroke="#002046" />
        <polygon points="12,24.5 36,17.5 36,23.5 12,30.5" fill="#E07A1F" stroke="#E07A1F" />
        <polygon points="12,33 36,26 36,32 12,39" fill="#002046" stroke="#002046" />
      </g>
    </svg>
  );
}

// Dhyana Stays logo mark — leaf swirl encircling a meditating figure.
// SVG recreation of the brand logo so it stays crisp at any size and
// works on both light and dark surfaces.
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dhyana-swirl" x1="10" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B7D8B0" />
          <stop offset="0.55" stopColor="#6FA968" />
          <stop offset="1" stopColor="#2F6B33" />
        </linearGradient>
        <linearGradient id="dhyana-topleaf" x1="50" y1="8" x2="92" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EAF4E6" />
          <stop offset="1" stopColor="#BCD9B4" />
        </linearGradient>
        <linearGradient id="dhyana-leaf" x1="0" y1="0" x2="20" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#67B05F" />
          <stop offset="1" stopColor="#2F7D33" />
        </linearGradient>
      </defs>

      {/* Circular swirl stroke */}
      <path
        d="M63 12 A 40 40 0 1 0 88 55"
        stroke="url(#dhyana-swirl)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Inner accent arc */}
      <path
        d="M22 30 A 34 34 0 0 0 20 62"
        stroke="#2F6B33"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Large top leaf */}
      <path
        d="M46 16 C 58 2 84 4 93 14 C 90 32 66 42 52 32 C 48 28 45 22 46 16 Z"
        fill="url(#dhyana-topleaf)"
      />
      <path
        d="M50 28 C 62 24 76 18 89 12"
        stroke="#5E8F58"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Small leaves — upper left pair */}
      <path
        d="M18 26 C 12 16 22 8 32 10 C 34 20 28 28 18 26 Z"
        fill="url(#dhyana-leaf)"
      />
      <path
        d="M34 24 C 32 16 40 12 47 14 C 47 21 42 26 34 24 Z"
        fill="#6FB667"
      />
      {/* Right-side leaf pair on swirl tail */}
      <path
        d="M78 62 C 88 58 96 66 95 74 C 86 78 78 72 78 62 Z"
        fill="url(#dhyana-leaf)"
      />
      <path
        d="M70 72 C 78 70 84 76 83 83 C 75 85 69 80 70 72 Z"
        fill="#6FB667"
      />

      {/* Meditating figure (navy silhouette) */}
      <g fill="#1E2749">
        {/* hair bun */}
        <circle cx="50" cy="33.5" r="3.4" />
        {/* head */}
        <circle cx="50" cy="42" r="6.6" />
        {/* torso */}
        <path d="M50 47 C 43.5 48.5 40.5 54 39.5 62 L 60.5 62 C 59.5 54 56.5 48.5 50 47 Z" />
        {/* arms */}
        <path
          d="M41.5 53 C 37 57 34 61.5 32.5 66.5 M58.5 53 C 63 57 66 61.5 67.5 66.5"
          stroke="#1E2749"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
        {/* hands */}
        <circle cx="32.5" cy="66.5" r="2.1" />
        <circle cx="67.5" cy="66.5" r="2.1" />
        {/* crossed legs */}
        <path d="M50 58 C 38 58 29 63 27.5 69.5 C 34 72.5 44 73.5 50 73.5 C 56 73.5 66 72.5 72.5 69.5 C 71 63 62 58 50 58 Z" />
      </g>
    </svg>
  );
}

export function LogoWordmark({ size = 36 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-xl font-semibold tracking-tight text-foreground">
        Dhyana<span className="text-primary">Stays</span>
      </span>
    </span>
  );
}

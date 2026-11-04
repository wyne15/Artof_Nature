/** Shared SVG patterns and the line-art bee icon, referenced with <use href="#beeico">. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="hp" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(.36)">
          <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="#5C6B2E" strokeOpacity=".3" strokeWidth="2.6" />
        </pattern>
        <pattern id="hpl" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(.8)">
          <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="#5C6B2E" strokeOpacity=".12" strokeWidth="1.5" />
        </pattern>
        <symbol id="beeico" viewBox="0 0 64 64">
          <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="30" cy="40" rx="16" ry="11" />
            <path d="M24 30 V50 M32 29.5 V50.5 M39 31 V49" />
            <path d="M44 38 C48 36 52 36 54 38 C53 42 49 44 44 43" />
            <path d="M50 35 Q53 29 58 28" />
            <path d="M14 40 L7 43" />
            <path d="M24 29 C18 14 30 8 34 18 C36 23 31 28 28 30 M32 29 C34 14 46 14 44 24 C43 28 37 30 35 30" />
            <path d="M28 22 L29 16 M38 22 L39 18" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}

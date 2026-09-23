type Shape = "fatter" | "mid" | "fitter";

const labels: Record<Shape, string> = {
  fatter: "Getting fatter",
  mid: "Getting going",
  fitter: "Getting fitter",
};

export function FitnessIcon({
  shape,
  className = "",
}: {
  shape: Shape;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <svg
        viewBox="0 0 64 80"
        className="h-14 w-11"
        aria-hidden="true"
        role="img"
      >
        {shape === "fatter" && (
          <>
            <circle cx="32" cy="12" r="8" fill="currentColor" />
            <ellipse cx="32" cy="46" rx="22" ry="22" fill="currentColor" />
            <rect x="14" y="64" width="8" height="14" rx="4" fill="currentColor" />
            <rect x="42" y="64" width="8" height="14" rx="4" fill="currentColor" />
          </>
        )}
        {shape === "mid" && (
          <>
            <circle cx="32" cy="12" r="8" fill="currentColor" />
            <ellipse cx="32" cy="44" rx="16" ry="20" fill="currentColor" />
            <rect x="18" y="62" width="7" height="16" rx="3.5" fill="currentColor" />
            <rect x="39" y="62" width="7" height="16" rx="3.5" fill="currentColor" />
          </>
        )}
        {shape === "fitter" && (
          <>
            <circle cx="32" cy="11" r="7.5" fill="currentColor" />
            <path
              d="M18 28 L32 24 L46 28 L42 52 L32 56 L22 52 Z"
              fill="currentColor"
            />
            <rect x="20" y="54" width="6" height="22" rx="3" fill="currentColor" />
            <rect x="38" y="54" width="6" height="22" rx="3" fill="currentColor" />
            <rect x="8" y="30" width="10" height="6" rx="3" fill="currentColor" />
            <rect x="46" y="30" width="10" height="6" rx="3" fill="currentColor" />
          </>
        )}
      </svg>
      <span className="sr-only">{labels[shape]}</span>
    </div>
  );
}

export function fitnessLabel(shape: Shape) {
  return labels[shape];
}

import type { MemberLook } from "@/lib/week";

const looks: Record<MemberLook, { src: string; label: string }> = {
  rest: { src: "/members/1-fat.png", label: "Just starting" },
  easy: { src: "/members/2-fat.png", label: "Warming up" },
  steady: { src: "/members/3-avg.png", label: "Getting going" },
  strong: { src: "/members/4-fit.png", label: "Getting fitter" },
};

export function FitnessIcon({
  look,
  className = "",
}: {
  look: MemberLook;
  className?: string;
}) {
  const art = looks[look];
  return (
    <img
      src={art.src}
      alt={art.label}
      className={`h-16 w-16 shrink-0 object-contain mix-blend-screen ${className}`}
    />
  );
}

export function fitnessLabel(look: MemberLook) {
  return looks[look].label;
}

export function EagleBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center overflow-hidden"
    >
      <div className="eagle-watermark aspect-[571/680] w-full max-w-xl" />
    </div>
  );
}

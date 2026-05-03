export function AmbientOrbs() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed -top-52 -left-32 z-0 h-[520px] w-[520px] rounded-full opacity-55 blur-[80px] animate-drift"
        style={{ background: "#d6dabb" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-44 -right-40 z-0 h-[460px] w-[460px] rounded-full opacity-55 blur-[80px] animate-drift"
        style={{ background: "#f1d6c3", animationDelay: "-8s" }}
      />
    </>
  );
}

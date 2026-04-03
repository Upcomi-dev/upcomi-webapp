export function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -right-24 -top-28 h-[620px] w-[620px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(213,143,56,0.22), transparent 62%)",
          filter: "blur(130px)",
        }}
      />
      <div
        className="absolute -left-28 bottom-0 h-[520px] w-[520px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(126,105,200,0.15), transparent 60%)",
          filter: "blur(120px)",
        }}
      />
      <div
        className="absolute bottom-24 right-[12%] h-[380px] w-[380px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(235,95,59,0.13), transparent 58%)",
          filter: "blur(110px)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-48"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,252,247,0.55), rgba(255,252,247,0))",
        }}
      />
    </div>
  );
}

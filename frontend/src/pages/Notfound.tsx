import { useEffect, useState } from "react";

// Cloud component
const Cloud = ({ scale = 1 }: { scale?: number }) => (
  <div
    className="relative flex items-end"
    style={{ transform: `scale(${scale})` }}
  >
    <div className="w-16 h-12 rounded-full bg-white/80 shadow-[0_4px_20px_rgba(186,230,253,0.5)]" />
    <div className="w-24 h-20 rounded-full bg-white/90 shadow-[0_4px_20px_rgba(186,230,253,0.5)] -ml-5 mb-2" />
    <div className="w-14 h-10 rounded-full bg-white/80 shadow-[0_4px_20px_rgba(186,230,253,0.5)] -ml-4" />
  </div>
);

// Sun with spinning rays
const Sun = () => (
  <div className="relative flex items-center justify-center w-24 h-24 md:w-32 md:h-32">
    <div className="absolute inset-0 flex items-center justify-center animate-spin [animation-duration:14s]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-full h-[3px] origin-center"
          style={{ transform: `rotate(${i * 45}deg)` }}
        >
          <div className="w-1/2 h-full ml-auto rounded-full bg-linear-to-r from-amber-300/80 to-transparent" />
        </div>
      ))}
    </div>
    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-linear-to-br from-yellow-200 to-amber-400 shadow-[0_0_32px_rgba(251,191,36,0.6)] z-10" />
  </div>
);

// Birds SVG
const Birds = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 200 60"
    fill="none"
    className={`absolute pointer-events-none ${className}`}
    style={{ animation: "birdFloat 6s ease-in-out infinite" }}
  >
    <path
      d="M10 30 Q20 18 30 30"
      stroke="#93c5fd"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M45 18 Q56 6 67 18"
      stroke="#93c5fd"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M80 36 Q90 24 100 36"
      stroke="#bae6fd"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M120 14 Q130 2 140 14"
      stroke="#bae6fd"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M158 28 Q168 16 178 28"
      stroke="#93c5fd"
      strokeWidth="1"
      strokeLinecap="round"
    />
  </svg>
);

const NotFound = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center font-[Nunito,sans-serif]">
      {/* Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&display=swap');

        @keyframes driftA {
          from { transform: translateX(-130%) translateY(0px); }
          to   { transform: translateX(110vw) translateY(-14px); }
        }
        @keyframes driftB {
          from { transform: translateX(-130%) translateY(0px); }
          to   { transform: translateX(110vw) translateY(12px); }
        }
        @keyframes driftC {
          from { transform: translateX(-80%) translateY(0px); }
          to   { transform: translateX(110vw) translateY(-7px); }
        }
        @keyframes floatY {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes birdFloat {
          0%,100% { transform: translateY(0px) translateX(0px); }
          50%      { transform: translateY(-9px) translateX(7px); }
        }
        @keyframes fadeInDown {
          from { opacity:0; transform: translateY(-28px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform: translateY(20px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 4px 20px rgba(56,189,248,0.3); }
          50%      { box-shadow: 0 8px 40px rgba(56,189,248,0.6); }
        }
      `}</style>

      {/* Sky */}
      <div className="absolute inset-0 bg-linear-to-b from-sky-200 via-sky-100 to-blue-50" />

      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[340px] rounded-full bg-sky-300/30 blur-3xl pointer-events-none" />

      {/* Clouds */}
      <div
        className="absolute top-[8%] pointer-events-none"
        style={{ animation: "driftA 30s linear infinite" }}
      >
        <Cloud scale={1} />
      </div>
      <div
        className="absolute top-[25%] pointer-events-none"
        style={{
          animation: "driftB 42s linear infinite",
          animationDelay: "-16s",
        }}
      >
        <Cloud scale={0.65} />
      </div>
      <div
        className="absolute top-[6%] pointer-events-none"
        style={{
          animation: "driftC 56s linear infinite",
          animationDelay: "-30s",
        }}
      >
        <Cloud scale={0.45} />
      </div>

      {/* Birds */}
      <Birds className="w-44 top-[17%] left-[58%] opacity-70" />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center text-center px-6"
        style={{
          opacity: visible ? 1 : 0,
          animation: visible
            ? "fadeInDown 0.85s cubic-bezier(.22,1,.36,1) both"
            : "none",
        }}
      >
        {/* 404 */}
        <div
          className="flex items-center justify-center gap-1 mb-6"
          style={{ animation: "floatY 5s ease-in-out infinite" }}
        >
          <span className="text-[7rem] md:text-[10rem] font-extrabold text-sky-500 leading-none tracking-tighter drop-shadow-[0_4px_20px_rgba(14,165,233,0.2)]">
            4
          </span>
          <Sun />
          <span className="text-[7rem] md:text-[10rem] font-extrabold text-sky-500 leading-none tracking-tighter drop-shadow-[0_4px_20px_rgba(14,165,233,0.2)]">
            4
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-2xl md:text-3xl font-bold text-sky-900 mb-3"
          style={{
            animation: "fadeInUp 0.85s 0.18s cubic-bezier(.22,1,.36,1) both",
            opacity: 0,
          }}
        >
          Oops, cette page s'est envolée&nbsp;!
        </h1>

        {/* Subtitle */}
        <p
          className="text-base md:text-lg font-light text-sky-700 max-w-md leading-relaxed mb-10"
          style={{
            animation: "fadeInUp 0.85s 0.32s cubic-bezier(.22,1,.36,1) both",
            opacity: 0,
          }}
        >
          Il semblerait que la page que vous cherchez flotte quelque part dans
          les nuages…
        </p>

        {/* Button */}
        <a
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-linear-to-r from-sky-400 to-sky-500 text-white font-semibold text-base tracking-wide transition-transform duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
          style={{
            animation:
              "fadeInUp 0.85s 0.46s cubic-bezier(.22,1,.36,1) both, pulseGlow 3s ease-in-out 1.4s infinite",
            opacity: 0,
          }}
        >
          <span className="text-lg"></span>
          Retourner à l'accueil
        </a>
      </div>

      {/* Horizon */}
      <div className="absolute bottom-[12%] inset-x-0 h-px bg-linear-to-r from-transparent via-sky-200/80 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-[12%] bg-linear-to-b from-sky-200/50 to-sky-100/80 rounded-[60%_60%_0_0/20px]" />
    </div>
  );
};

export default NotFound;

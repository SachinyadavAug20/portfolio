import { useEffect, useState } from "react";

export const HeroModelPlaceholder = () => {
  const [terminalLine, setTerminalLine] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTerminalLine((prev) => (prev + 1) % 4);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center xl:justify-end xl:pr-12 pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* Retro 3D Computer Holographic Wireframe Card */}
      <div className="relative w-full max-w-[340px] sm:max-w-[420px] aspect-square flex flex-col items-center justify-center">
        {/* Ambient Cyan/Teal Halo */}
        <div className="absolute inset-10 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />

        {/* Isometric Retro PC SVG Illustration */}
        <div className="relative w-64 sm:w-80 transition-transform duration-700 hover:scale-105">
          <svg
            viewBox="0 0 320 280"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]"
          >
            {/* Ground Grid Shadows */}
            <ellipse
              cx="160"
              cy="255"
              rx="120"
              ry="18"
              fill="rgba(0,0,0,0.35)"
            />

            {/* Monitor Chassis Outer Bevel */}
            <rect
              x="60"
              y="30"
              width="200"
              height="165"
              rx="16"
              fill="#27272a"
              stroke="#3f3f46"
              strokeWidth="2.5"
            />
            {/* Monitor Screen Bezel */}
            <rect
              x="76"
              y="44"
              width="168"
              height="124"
              rx="10"
              fill="#18181b"
              stroke="#27272a"
              strokeWidth="2"
            />

            {/* CRT Screen Glow */}
            <rect
              x="84"
              y="52"
              width="152"
              height="108"
              rx="6"
              fill="#090d16"
            />
            <rect
              x="84"
              y="52"
              width="152"
              height="108"
              rx="6"
              fill="url(#crtGlow)"
              opacity="0.4"
            />

            {/* CRT Scanlines Filter */}
            <pattern
              id="scanlines"
              width="100%"
              height="4"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                stroke="rgba(0, 240, 255, 0.08)"
                strokeWidth="1"
              />
            </pattern>
            <rect
              x="84"
              y="52"
              width="152"
              height="108"
              rx="6"
              fill="url(#scanlines)"
            />

            {/* Terminal Screen Content */}
            <text
              x="94"
              y="74"
              fill="#22d3ee"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              sachin@dev:~$
            </text>
            <text
              x="94"
              y="88"
              fill="#38bdf8"
              fontSize="8"
              fontFamily="monospace"
              opacity={terminalLine >= 0 ? 0.9 : 0.2}
            >
              › loading 3d voxel...
            </text>
            <text
              x="94"
              y="102"
              fill="#34d399"
              fontSize="8"
              fontFamily="monospace"
              opacity={terminalLine >= 1 ? 0.9 : 0.2}
            >
              › three.js shaders [ok]
            </text>
            <text
              x="94"
              y="116"
              fill="#a78bfa"
              fontSize="8"
              fontFamily="monospace"
              opacity={terminalLine >= 2 ? 0.9 : 0.2}
            >
              › orbit controls ready
            </text>

            {/* Blinking Cursor */}
            <rect
              x="94"
              y="126"
              width="6"
              height="9"
              fill="#22d3ee"
              className="animate-pulse"
            />

            {/* Power LED Indicator */}
            <circle cx="230" cy="180" r="3" fill="#22c55e" />
            <circle
              cx="230"
              cy="180"
              r="5"
              fill="#22c55e"
              opacity="0.4"
              className="animate-ping"
            />

            {/* Floppy Drive Slot */}
            <rect
              x="80"
              y="178"
              width="45"
              height="4"
              rx="1.5"
              fill="#18181b"
            />

            {/* Monitor Base Stand */}
            <path
              d="M130 195 L190 195 L200 215 L120 215 Z"
              fill="#27272a"
              stroke="#3f3f46"
              strokeWidth="1.5"
            />

            {/* Keyboard */}
            <path
              d="M75 228 L245 228 L260 252 L60 252 Z"
              fill="#27272a"
              stroke="#3f3f46"
              strokeWidth="2"
            />
            {/* Keyboard Key Rows */}
            <rect
              x="80"
              y="233"
              width="160"
              height="5"
              rx="1"
              fill="#3f3f46"
            />
            <rect
              x="75"
              y="241"
              width="170"
              height="5"
              rx="1"
              fill="#3f3f46"
            />

            {/* Mouse */}
            <rect
              x="270"
              y="235"
              width="20"
              height="28"
              rx="6"
              fill="#27272a"
              stroke="#3f3f46"
              strokeWidth="1.5"
            />
            <line
              x1="280"
              y1="235"
              x2="280"
              y2="246"
              stroke="#52525b"
              strokeWidth="1"
            />

            {/* Linear Gradients */}
            <defs>
              <linearGradient
                id="crtGlow"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#0891b2" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Minimal Floating Status Badge */}
        <div className="mt-3 flex items-center gap-2 rounded-full border border-cyan-500/30 bg-zinc-950/80 px-3 py-1 font-mono text-[11px] text-cyan-300 shadow-lg backdrop-blur-md">
          <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Interactive 3D Workspace · Initializing</span>
        </div>
      </div>
    </div>
  );
};

export default HeroModelPlaceholder;

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "fitequb_onboarded";

const screens = [
  {
    title: "Stake",
    description:
      "Put your money where your muscles are. Stake 100–1,000 ETB to join a 30-day fitness challenge.",
    icon: (
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Pot */}
        <ellipse cx="80" cy="120" rx="40" ry="12" fill="#1c1c1e" />
        <path
          d="M50 80 C50 80 45 120 50 120 L110 120 C115 120 110 80 110 80 Z"
          fill="#2c2c2e"
          stroke="#3a3a3c"
          strokeWidth="2"
        />
        <ellipse cx="80" cy="80" rx="30" ry="8" fill="#3a3a3c" />
        {/* Coins falling */}
        <g>
          <ellipse cx="65" cy="35" rx="12" ry="4" fill="#FFD700" />
          <rect x="53" y="32" width="24" height="3" fill="#E6C200" />
          <text
            x="65"
            y="37"
            textAnchor="middle"
            fontSize="6"
            fill="#8B6914"
            fontWeight="bold"
          >
            ETB
          </text>
        </g>
        <g opacity="0.8">
          <ellipse cx="90" cy="20" rx="12" ry="4" fill="#FFD700" />
          <rect x="78" y="17" width="24" height="3" fill="#E6C200" />
          <text
            x="90"
            y="22"
            textAnchor="middle"
            fontSize="6"
            fill="#8B6914"
            fontWeight="bold"
          >
            ETB
          </text>
        </g>
        <g opacity="0.6">
          <ellipse cx="75" cy="52" rx="12" ry="4" fill="#FFD700" />
          <rect x="63" y="49" width="24" height="3" fill="#E6C200" />
          <text
            x="75"
            y="54"
            textAnchor="middle"
            fontSize="6"
            fill="#8B6914"
            fontWeight="bold"
          >
            ETB
          </text>
        </g>
        {/* Motion lines */}
        <line
          x1="55"
          y1="40"
          x2="58"
          y2="50"
          stroke="#FFD700"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="100"
          y1="25"
          x2="97"
          y2="45"
          stroke="#FFD700"
          strokeWidth="1.5"
          opacity="0.4"
        />
      </svg>
    ),
  },
  {
    title: "Sweat",
    description:
      "Hit 80% of your workout targets. Log steps, gym check-ins, or photo proof daily.",
    icon: (
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground line */}
        <line
          x1="30"
          y1="130"
          x2="130"
          y2="130"
          stroke="#2c2c2e"
          strokeWidth="2"
        />
        {/* Running person */}
        {/* Head */}
        <circle cx="85" cy="40" r="10" fill="#00C853" />
        {/* Body */}
        <line
          x1="85"
          y1="50"
          x2="80"
          y2="80"
          stroke="#00C853"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Arms */}
        <line
          x1="80"
          y1="60"
          x2="65"
          y2="55"
          stroke="#00C853"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="80"
          y1="60"
          x2="95"
          y2="70"
          stroke="#00C853"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Legs */}
        <line
          x1="80"
          y1="80"
          x2="65"
          y2="105"
          stroke="#00C853"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="65"
          y1="105"
          x2="55"
          y2="128"
          stroke="#00C853"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="80"
          y1="80"
          x2="95"
          y2="100"
          stroke="#00C853"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="95"
          y1="100"
          x2="105"
          y2="128"
          stroke="#00C853"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Sweat drops */}
        <circle cx="100" cy="38" r="2" fill="#4FC3F7" opacity="0.8" />
        <circle cx="105" cy="45" r="1.5" fill="#4FC3F7" opacity="0.6" />
        <circle cx="98" cy="50" r="1.5" fill="#4FC3F7" opacity="0.5" />
        {/* Motion lines */}
        <line
          x1="45"
          y1="60"
          x2="55"
          y2="60"
          stroke="#00C853"
          strokeWidth="1.5"
          opacity="0.3"
        />
        <line
          x1="40"
          y1="70"
          x2="52"
          y2="70"
          stroke="#00C853"
          strokeWidth="1.5"
          opacity="0.25"
        />
        <line
          x1="42"
          y1="80"
          x2="50"
          y2="80"
          stroke="#00C853"
          strokeWidth="1.5"
          opacity="0.2"
        />
      </svg>
    ),
  },
  {
    title: "Win",
    description:
      "Complete the challenge and split the pot. Your fitness literally pays you.",
    icon: (
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Trophy */}
        <path
          d="M60 50 L60 35 L100 35 L100 50 C100 70 90 85 80 90 C70 85 60 70 60 50Z"
          fill="#FFD700"
          stroke="#E6C200"
          strokeWidth="2"
        />
        {/* Trophy handles */}
        <path
          d="M60 45 C50 45 45 55 50 65 L60 60"
          stroke="#FFD700"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M100 45 C110 45 115 55 110 65 L100 60"
          stroke="#FFD700"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {/* Trophy stem and base */}
        <rect x="76" y="90" width="8" height="15" fill="#E6C200" />
        <rect x="65" y="105" width="30" height="6" rx="2" fill="#FFD700" />
        {/* Star on trophy */}
        <polygon
          points="80,45 83,55 93,55 85,61 88,71 80,65 72,71 75,61 67,55 77,55"
          fill="#FFF8DC"
          opacity="0.9"
        />
        {/* Money bills */}
        <g opacity="0.8">
          <rect
            x="30"
            y="70"
            width="28"
            height="16"
            rx="2"
            fill="#00C853"
            transform="rotate(-15 44 78)"
          />
          <text
            x="44"
            y="81"
            textAnchor="middle"
            fontSize="7"
            fill="#004D1A"
            fontWeight="bold"
            transform="rotate(-15 44 78)"
          >
            ETB
          </text>
        </g>
        <g opacity="0.7">
          <rect
            x="105"
            y="72"
            width="28"
            height="16"
            rx="2"
            fill="#00C853"
            transform="rotate(10 119 80)"
          />
          <text
            x="119"
            y="83"
            textAnchor="middle"
            fontSize="7"
            fill="#004D1A"
            fontWeight="bold"
            transform="rotate(10 119 80)"
          >
            ETB
          </text>
        </g>
        {/* Sparkles */}
        <circle cx="45" cy="30" r="2" fill="#FFD700" opacity="0.6" />
        <circle cx="115" cy="28" r="2.5" fill="#FFD700" opacity="0.7" />
        <circle cx="35" cy="50" r="1.5" fill="#FFD700" opacity="0.4" />
        <circle cx="125" cy="48" r="1.5" fill="#FFD700" opacity="0.5" />
      </svg>
    ),
  },
];

export function Onboarding() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const isLast = current === screens.length - 1;
  // biome-ignore lint: index is always in bounds via state constraints
  const screen = screens[current]!;

  function complete() {
    localStorage.setItem(STORAGE_KEY, "true");
    navigate("/", { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
      }}
    >
      {/* Skip */}
      {!isLast && (
        <button
          type="button"
          onClick={complete}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            color: "#8E8E93",
            fontSize: 14,
            cursor: "pointer",
            padding: "8px 12px",
          }}
        >
          Skip
        </button>
      )}

      {/* Illustration */}
      <div style={{ marginBottom: 40 }}>{screen.icon}</div>

      {/* Title */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: "#FFFFFF",
          margin: "0 0 12px",
          textAlign: "center",
        }}
      >
        {screen.title}
      </h1>

      {/* Description */}
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.5,
          color: "#8E8E93",
          textAlign: "center",
          margin: "0 0 48px",
          maxWidth: 320,
        }}
      >
        {screen.description}
      </p>

      {/* Dot indicators */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {screens.map((s, i) => (
          <div
            key={`dot-${s.title}`}
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === current ? "#00C853" : "#3a3a3c",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Action button */}
      <button
        type="button"
        onClick={isLast ? complete : () => setCurrent((c) => c + 1)}
        style={{
          width: "100%",
          maxWidth: 320,
          padding: "16px 0",
          borderRadius: 12,
          border: "none",
          backgroundColor: "#00C853",
          color: "#0a0a0a",
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {isLast ? "Get Started" : "Next"}
      </button>
    </div>
  );
}

export function isOnboarded(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

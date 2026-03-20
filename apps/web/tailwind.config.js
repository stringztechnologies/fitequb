/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				tg: {
					bg: "var(--tg-theme-bg-color, #0D0F14)",
					text: "var(--tg-theme-text-color, #F5F5F7)",
					hint: "var(--tg-theme-hint-color, #8E8E93)",
					link: "var(--tg-theme-link-color, #00C853)",
					button: "var(--tg-theme-button-color, #00C853)",
					"button-text": "var(--tg-theme-button-text-color, #000000)",
					"secondary-bg": "var(--tg-theme-secondary-bg-color, #1A1D24)",
				},
				brand: {
					green: "#00C853",
					"green-dark": "#00A844",
					gold: "#FFD700",
					"gold-dark": "#E6C200",
					dark: "#0D0F14",
					card: "#1A1D24",
					"card-hover": "#22262E",
					surface: "#13151A",
					border: "#2A2D35",
				},
			},
			backgroundImage: {
				"gradient-green": "linear-gradient(135deg, #00C853 0%, #00E676 100%)",
				"gradient-gold": "linear-gradient(135deg, #FFD700 0%, #FFAB00 100%)",
				"gradient-card": "linear-gradient(135deg, #1A1D24 0%, #22262E 100%)",
				"gradient-hero": "linear-gradient(180deg, #00C853 0%, #0D0F14 60%)",
			},
			boxShadow: {
				glow: "0 0 20px rgba(0, 200, 83, 0.15)",
				"glow-gold": "0 0 20px rgba(255, 215, 0, 0.15)",
				card: "0 2px 12px rgba(0, 0, 0, 0.3)",
			},
			animation: {
				"pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
			},
		},
	},
	plugins: [],
};

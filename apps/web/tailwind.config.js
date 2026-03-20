/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				tg: {
					bg: "var(--tg-theme-bg-color, #0a0a0a)",
					text: "var(--tg-theme-text-color, #FFFFFF)",
					hint: "var(--tg-theme-hint-color, #8E8E93)",
					link: "var(--tg-theme-link-color, #00C853)",
					button: "var(--tg-theme-button-color, #00C853)",
					"button-text": "var(--tg-theme-button-text-color, #000000)",
					"secondary-bg": "var(--tg-theme-secondary-bg-color, #1c1c1e)",
				},
				brand: {
					green: "#00C853",
					"green-light": "#00E676",
					gold: "#FFD700",
					"gold-dark": "#D4A800",
					dark: "#0a0a0a",
					card: "#1c1c1e",
					"card-hover": "#2c2c2e",
					surface: "#111111",
					border: "#2c2c2e",
					"border-green": "rgba(0, 200, 83, 0.3)",
					"border-gold": "rgba(255, 215, 0, 0.3)",
				},
			},
			borderRadius: {
				card: "16px",
			},
			backgroundImage: {
				"gradient-green": "linear-gradient(135deg, #00C853 0%, #00E676 100%)",
				"gradient-gold": "linear-gradient(135deg, #FFD700 0%, #FFAB00 100%)",
			},
			boxShadow: {
				glow: "0 0 20px rgba(0, 200, 83, 0.2)",
				"glow-strong": "0 0 30px rgba(0, 200, 83, 0.3)",
				"glow-gold": "0 0 20px rgba(255, 215, 0, 0.2)",
			},
			spacing: {
				"card-p": "16px",
				"section-gap": "12px",
			},
			fontSize: {
				"2xs": ["10px", "14px"],
			},
		},
	},
	plugins: [],
};

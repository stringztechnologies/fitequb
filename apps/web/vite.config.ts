import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg"],
			manifest: {
				name: "FitEqub",
				short_name: "FitEqub",
				description: "Stake. Sweat. Split the pot. Fitness accountability groups in Addis Ababa.",
				theme_color: "#131313",
				background_color: "#131313",
				display: "standalone",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "/icons/icon-192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/icons/icon-512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "/icons/icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "google-fonts-cache",
							expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
						},
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "gstatic-fonts-cache",
							expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
						},
					},
				],
			},
		}),
	],
	server: {
		port: 5173,
	},
});

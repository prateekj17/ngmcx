import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"], theme: { extend: { colors: { ink: "#101827", panel: "#172235", muted: "#8da0b8", line: "#29384d", accent: "#54d6a0" } } }, plugins: [] };
export default config;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ["cloudvandana-crud-frontend-3yv8.onrender.com"],
  },
});
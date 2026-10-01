import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Giao diện và máy chủ cùng đọc WEB_ORIGIN để không bị lệch cổng.
  const webOrigin = new URL(env.WEB_ORIGIN || "http://localhost:5173");
  const port = Number(
    webOrigin.port || (webOrigin.protocol === "https:" ? 443 : 80),
  );
  return {
    plugins: [react()],
    server: {
      port,
      // Nếu cổng đã bận, báo lỗi rõ ràng thay vì âm thầm chuyển cổng.
      strictPort: true,
      proxy: { "/api": `http://127.0.0.1:${env.PORT || 3001}` },
    },
  };
});

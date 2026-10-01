import express from "express";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
// Nạp các module sau .env để DB_PATH và cấu hình được áp dụng đúng.
const { identify, checkOrigin } = await import("./security.js");
const routeNames = [
  "auth",
  "products",
  "cart",
  "notifications",
  "users",
  "settings",
  "favorites",
  "orders",
  "payments",
  "admin",
  "categories",
  "account",
  "inquiries",
];
const routes = await Promise.all(
  routeNames.map((name) => import(`./routes/${name}.js`)),
);
export const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use(
  "/api",
  (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  },
  express.json({ limit: "16kb" }),
  checkOrigin,
  identify,
);
routeNames.forEach((name, i) => app.use(`/api/${name}`, routes[i].default));
app.use("/api", (req, res) =>
  res.status(404).json({ message: "Không tìm thấy chức năng." }),
);
const dist = resolve("dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("/{*path}", (req, res) => res.sendFile(resolve(dist, "index.html")));
}
app.use((error, req, res, next) => {
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error("Server error:", error.message);
  res.status(status).json({
    message:
      status === 500
        ? "Có lỗi máy chủ. Vui lòng thử lại."
        : "Dữ liệu yêu cầu không hợp lệ.",
  });
});
const port = process.env.PORT === undefined ? 3001 : Number(process.env.PORT);
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Vườn Nhà: http://localhost:${server.address().port}`),
);

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { db, publicUser } from "./database.js";
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}
export async function checkPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
export function cookieToken(req) {
  return req.headers.cookie
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("vn_session="))
    ?.slice(11);
}
const options = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
});
export function createSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    hashToken(token),
    userId,
    Date.now() + 7 * 86400000,
  );
  res.cookie("vn_session", token, { ...options(), maxAge: 7 * 86400000 });
}
export function removeSession(req, res) {
  const token = cookieToken(req);
  if (token)
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hashToken(token));
  res.clearCookie("vn_session", options());
}
export function identify(req, res, next) {
  const token = cookieToken(req);
  req.user = token
    ? publicUser(
        db
          .prepare(
            "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?",
          )
          .get(hashToken(token), Date.now()),
      )
    : null;
  next();
}
export function requireUser(req, res, next) {
  if (!req.user)
    return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục." });
  next();
}
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    if (!roles.includes(req.user.role))
      return res
        .status(403)
        .json({ message: "Tài khoản không có quyền thực hiện thao tác này." });
    next();
  };
const attempts = new Map();
export function authRateLimit(req, res, next) {
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until < now) attempts.delete(key);
  const key = req.ip;
  let bucket = attempts.get(key);
  if (!bucket) {
    bucket = { count: 0, until: now + 15 * 60000 };
    attempts.set(key, bucket);
  }
  if (++bucket.count > 20)
    return res.status(429).json({
      message: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.",
    });
  next();
}
export function checkOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  // WEB_ORIGIN có dấu / cuối vẫn là cùng một địa chỉ website.
  const normalizeOrigin = (value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
    } catch {
      return null;
    }
  };
  const allowed = [
    `http://${req.headers.host}`,
    `https://${req.headers.host}`,
    process.env.WEB_ORIGIN || "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]
    .map(normalizeOrigin)
    .filter(Boolean);
  if (origin && !allowed.includes(normalizeOrigin(origin)))
    return res.status(403).json({ message: "Nguồn yêu cầu không hợp lệ." });
  next();
}

import { Router } from "express";
import { db, publicUser, notify } from "../database.js";
import {
  hashPassword,
  checkPassword,
  createSession,
  removeSession,
  authRateLimit,
} from "../security.js";
const router = Router();
const emailValid = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
router.get("/me", (req, res) => res.json({ user: req.user }));
router.post("/register", authRateLimit, async (req, res) => {
  const { name, email, password } = req.body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 80 ||
    !emailValid(email) ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  )
    return res.status(400).json({
      message:
        "Nhập tên (tối đa 80 ký tự), email hợp lệ và mật khẩu từ 8–128 ký tự.",
    });
  if (db.prepare("SELECT id FROM users WHERE email=?").get(email.trim()))
    return res.status(409).json({ message: "Email này đã được đăng ký." });
  const passwordHash = await hashPassword(password);
  // Không đọc role từ trình duyệt: tài khoản đăng ký luôn là khách hàng.
  let id;
  try {
    id = Number(
      db
        .prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)")
        .run(name.trim(), email.trim().toLowerCase(), passwordHash)
        .lastInsertRowid,
    );
  } catch (error) {
    if (db.prepare("SELECT id FROM users WHERE email=?").get(email.trim()))
      return res.status(409).json({ message: "Email này đã được đăng ký." });
    throw error;
  }
  notify(
    id,
    "Chào mừng đến Vườn Nhà",
    "Tài khoản của bạn đã sẵn sàng. Hãy khám phá rau củ và trái cây trong cửa hàng.",
  );
  createSession(res, id);
  res.status(201).json({
    user: publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(id)),
  });
});
router.post("/login", authRateLimit, async (req, res) => {
  const { email, password } = req.body;
  if (
    !emailValid(email) ||
    typeof password !== "string" ||
    password.length > 128
  )
    return res
      .status(400)
      .json({ message: "Vui lòng nhập email và mật khẩu hợp lệ." });
  const user = db
    .prepare("SELECT * FROM users WHERE email=?")
    .get(email.trim());
  if (!user || !(await checkPassword(password, user.password_hash)))
    return res.status(401).json({ message: "Email hoặc mật khẩu chưa đúng." });
  createSession(res, user.id);
  res.json({ user: publicUser(user) });
});
router.post("/logout", (req, res) => {
  removeSession(req, res);
  res.json({ ok: true });
});
export default router;

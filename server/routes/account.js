import { Router } from "express";
import { db, publicUser, notify } from "../database.js";
import {
  requireUser,
  checkPassword,
  hashPassword,
  createSession,
  authRateLimit,
} from "../security.js";
const router = Router();
router.use(requireUser);
router.get("/", (req, res) => {
  const summary = db
    .prepare(
      `SELECT COUNT(*) AS orderCount,
    COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','delivered') THEN 1 ELSE 0 END),0) AS activeOrders
    FROM orders WHERE user_id=?`,
    )
    .get(req.user.id);
  res.json({ user: req.user, summary });
});
router.put("/", (req, res) => {
  const { name, phone = "", address = "" } = req.body || {};
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80 ||
    typeof phone !== "string" ||
    (phone.trim() && !/^\+?[0-9 ()-]{8,20}$/.test(phone.trim())) ||
    typeof address !== "string" ||
    address.trim().length > 300
  )
    return res
      .status(400)
      .json({
        message:
          "Tên 2–80 ký tự, điện thoại hợp lệ (8–20 ký tự) và địa chỉ tối đa 300 ký tự.",
      });
  // Chỉ sửa hồ sơ của phiên hiện tại; không nhận id/role/email từ trình duyệt.
  db.prepare("UPDATE users SET name=?,phone=?,address=? WHERE id=?").run(
    name.trim(),
    phone.trim(),
    address.trim(),
    req.user.id,
  );
  res.json({
    user: publicUser(
      db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id),
    ),
  });
});
router.post("/password", authRateLimit, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (
    typeof currentPassword !== "string" ||
    currentPassword.length > 128 ||
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 128 ||
    currentPassword === newPassword
  )
    return res
      .status(400)
      .json({
        message: "Mật khẩu mới cần 8–128 ký tự và khác mật khẩu hiện tại.",
      });
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (!(await checkPassword(currentPassword, user.password_hash)))
    return res.status(400).json({ message: "Mật khẩu hiện tại chưa đúng." });
  const hash = await hashPassword(newPassword);
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = db
      .prepare(
        "UPDATE users SET password_hash=? WHERE id=? AND password_hash=?",
      )
      .run(hash, user.id, user.password_hash);
    if (!result.changes) {
      db.exec("ROLLBACK");
      return res
        .status(409)
        .json({ message: "Mật khẩu vừa thay đổi. Hãy đăng nhập lại." });
    }
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
    createSession(res, user.id);
    notify(
      user.id,
      "Đã đổi mật khẩu",
      "Mật khẩu đã cập nhật; các phiên đăng nhập cũ được kết thúc.",
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  res.json({ ok: true });
});
export default router;

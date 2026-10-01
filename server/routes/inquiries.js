import { Router } from "express";
import { db, notify } from "../database.js";
import { requireUser, requireRole } from "../security.js";
const router = Router();
const limits = new Map();
router.post("/", (req, res) => {
  const { name, email, phone = "", message } = req.body || {};
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80 ||
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof phone !== "string" ||
    (phone.trim() && !/^\+?[0-9 ()-]{8,20}$/.test(phone.trim())) ||
    typeof message !== "string" ||
    message.trim().length < 10 ||
    message.trim().length > 2000
  )
    return res
      .status(400)
      .json({
        message:
          "Kiểm tra tên, email, điện thoại và nội dung liên hệ (10–2.000 ký tự).",
      });
  const now = Date.now();
  for (const [key, value] of limits) if (value.until < now) limits.delete(key);
  const key = req.ip,
    bucket = limits.get(key) || { count: 0, until: now + 10 * 60000 };
  if (bucket.count >= 5)
    return res
      .status(429)
      .json({
        message: "Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau 10 phút.",
      });
  bucket.count++;
  limits.set(key, bucket);
  const result = db
    .prepare(
      "INSERT INTO inquiries(user_id,name,email,phone,message) VALUES(?,?,?,?,?)",
    )
    .run(
      req.user?.id || null,
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      message.trim(),
    );
  res
    .status(201)
    .json({
      id: Number(result.lastInsertRowid),
      message:
        "Đã lưu yêu cầu liên hệ. Cửa hàng có thể xem trong khu vực làm việc.",
    });
});
router.get("/", requireUser, (req, res) => {
  const all = req.query.scope === "all";
  if (all && !["staff", "manager"].includes(req.user.role))
    return res
      .status(403)
      .json({ message: "Bạn không có quyền xem liên hệ của khách khác." });
  const inquiries = all
    ? db
        .prepare(
          "SELECT * FROM inquiries ORDER BY created_at DESC,id DESC LIMIT 200",
        )
        .all()
    : db
        .prepare(
          "SELECT * FROM inquiries WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 200",
        )
        .all(req.user.id);
  res.json({ inquiries });
});
router.patch("/:id", requireRole("staff", "manager"), (req, res) => {
  const { status, reply = "" } = req.body || {};
  if (
    !["new", "read", "resolved"].includes(status) ||
    typeof reply !== "string" ||
    reply.length > 2000
  )
    return res
      .status(400)
      .json({
        message: "Trạng thái không hợp lệ hoặc phản hồi quá 2.000 ký tự.",
      });
  const current = db
    .prepare("SELECT * FROM inquiries WHERE id=?")
    .get(req.params.id);
  if (!current)
    return res.status(404).json({ message: "Không tìm thấy yêu cầu liên hệ." });
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE inquiries SET status=?,reply=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).run(status, reply.trim(), current.id);
    if (current.user_id && reply.trim() && reply.trim() !== current.reply)
      notify(
        current.user_id,
        "Cửa hàng đã phản hồi",
        `Yêu cầu #${current.id} đã có phản hồi. Xem tại Tài khoản → Hỗ trợ.`,
      );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  res.json({
    inquiry: db.prepare("SELECT * FROM inquiries WHERE id=?").get(current.id),
  });
});
export default router;

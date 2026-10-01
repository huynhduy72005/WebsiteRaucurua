import { Router } from "express";
import { db, notify, publicUser } from "../database.js";
import { requireRole } from "../security.js";
const router = Router();
router.use(requireRole("manager"));
router.get("/", (req, res) =>
  res.json({
    users: db
      .prepare(
        "SELECT id,name,email,role,phone,address,created_at FROM users ORDER BY id DESC",
      )
      .all(),
  }),
);
router.get("/:id", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!user)
    return res.status(404).json({ message: "Không tìm thấy tài khoản." });
  const summary = db
    .prepare(
      `SELECT COUNT(*) AS orderCount,
    COALESCE(SUM(CASE WHEN payment_status='paid' AND status!='cancelled' THEN total ELSE 0 END),0) AS paidTotal
    FROM orders WHERE user_id=?`,
    )
    .get(user.id);
  const orders = db
    .prepare(
      "SELECT id,total,status,payment_status,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 5",
    )
    .all(user.id);
  res.json({ user: publicUser(user), summary, orders });
});
router.patch("/:id/role", (req, res) => {
  const { role } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!user)
    return res.status(404).json({ message: "Không tìm thấy tài khoản." });
  if (!["customer", "staff", "manager"].includes(role))
    return res.status(400).json({ message: "Vai trò không hợp lệ." });
  if (user.id === req.user.id && role !== "manager")
    return res
      .status(400)
      .json({ message: "Bạn không thể hạ quyền của chính mình." });
  db.prepare("UPDATE users SET role=? WHERE id=?").run(role, user.id);
  notify(
    user.id,
    "Quyền tài khoản đã cập nhật",
    `Vai trò mới: ${{ customer: "Khách hàng", staff: "Nhân viên", manager: "Quản lý" }[role]}.`,
  );
  res.json({ ok: true });
});
export default router;

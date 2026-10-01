import { Router } from "express";
import { db } from "../database.js";
import { requireUser } from "../security.js";
const router = Router();
router.use(requireUser);
router.get("/", (req, res) =>
  res.json({
    notifications: db
      .prepare(
        "SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50",
      )
      .all(req.user.id),
  }),
);
router.patch("/read", (req, res) => {
  db.prepare("UPDATE notifications SET is_read=1 WHERE user_id=?").run(
    req.user.id,
  );
  res.json({ ok: true });
});
export default router;

import { Router } from "express";
import { db } from "../database.js";
import { requireUser } from "../security.js";
const router = Router();
router.use(requireUser);
const read = (userId) =>
  db
    .prepare(
      "SELECT p.* FROM favorites f JOIN products p ON p.id=f.product_id WHERE f.user_id=? AND p.is_active=1 ORDER BY f.created_at DESC,p.id",
    )
    .all(userId);
router.get("/", (req, res) => res.json({ products: read(req.user.id) }));
router.put("/:id", (req, res) => {
  if (typeof req.body.favorite !== "boolean")
    return res
      .status(400)
      .json({ message: "Lựa chọn yêu thích không hợp lệ." });
  if (
    !db
      .prepare("SELECT id FROM products WHERE id=? AND is_active=1")
      .get(req.params.id)
  )
    return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  if (req.body.favorite)
    db.prepare(
      "INSERT OR IGNORE INTO favorites(user_id,product_id) VALUES(?,?)",
    ).run(req.user.id, req.params.id);
  else
    db.prepare("DELETE FROM favorites WHERE user_id=? AND product_id=?").run(
      req.user.id,
      req.params.id,
    );
  res.json({ products: read(req.user.id) });
});
export default router;

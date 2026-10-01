import { Router } from "express";
import { db, notify } from "../database.js";
import { requireUser } from "../security.js";
const router = Router();
router.use(requireUser);
const readCart = (userId) =>
  db
    .prepare(
      "SELECT p.*,c.quantity FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=? AND p.is_active=1 ORDER BY p.id",
    )
    .all(userId);
router.get("/", (req, res) => res.json({ items: readCart(req.user.id) }));
router.post("/merge", (req, res) => {
  const items = req.body.items;
  if (
    !Array.isArray(items) ||
    items.length > 100 ||
    items.some(
      (i) =>
        !Number.isInteger(i.id) ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > 999,
    )
  )
    return res.status(400).json({ message: "Giỏ hàng không hợp lệ." });
  db.exec("BEGIN");
  try {
    for (const i of items) {
      const product = db
        .prepare("SELECT stock FROM products WHERE id=? AND is_active=1")
        .get(i.id);
      if (!product?.stock) continue;
      const old = db
        .prepare("SELECT quantity FROM cart WHERE user_id=? AND product_id=?")
        .get(req.user.id, i.id);
      const quantity = Math.min(
        (old?.quantity || 0) + i.quantity,
        product.stock,
        999,
      );
      db.prepare(
        "INSERT INTO cart VALUES(?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity",
      ).run(req.user.id, i.id, quantity);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  res.json({ items: readCart(req.user.id) });
});
router.put("/:id", (req, res) => {
  const { quantity } = req.body;
  const product = db
    .prepare("SELECT * FROM products WHERE id=? AND is_active=1")
    .get(req.params.id);
  if (!product)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999)
    return res
      .status(400)
      .json({ message: "Số lượng phải là số nguyên từ 0–999." });
  if (quantity > product.stock)
    return res.status(409).json({
      message: `${product.name} hiện còn ${product.stock} ${product.unit}.`,
    });
  if (quantity === 0)
    db.prepare("DELETE FROM cart WHERE user_id=? AND product_id=?").run(
      req.user.id,
      product.id,
    );
  else {
    const old = db
      .prepare("SELECT quantity FROM cart WHERE user_id=? AND product_id=?")
      .get(req.user.id, product.id);
    db.prepare(
      "INSERT INTO cart VALUES(?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity",
    ).run(req.user.id, product.id, quantity);
    if (!old)
      notify(
        req.user.id,
        "Đã thêm vào giỏ hàng",
        `${product.name} đã được thêm vào giỏ hàng của bạn.`,
      );
  }
  res.json({ items: readCart(req.user.id) });
});
export default router;

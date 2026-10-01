import { Router } from "express";
import { db } from "../database.js";
import { requireRole } from "../security.js";
import { validateProduct } from "../services/product-validation.js";
const router = Router();
const read = (id) => db.prepare("SELECT * FROM products WHERE id=?").get(id);
const missing = (res) =>
  res.status(404).json({ message: "Không tìm thấy sản phẩm." });
const conflict = (res) =>
  res.status(409).json({
    message:
      "Sản phẩm hoặc tồn kho vừa thay đổi. Hãy tải lại danh sách rồi mở form sửa lại.",
  });
router.get("/", (req, res) =>
  res.json({
    products: db
      .prepare("SELECT * FROM products WHERE is_active=1 ORDER BY id")
      .all(),
  }),
);
router.get("/manage", requireRole("staff", "manager"), (req, res) =>
  res.json({
    products: db
      .prepare(
        req.user.role === "manager"
          ? "SELECT * FROM products ORDER BY id DESC"
          : "SELECT * FROM products WHERE is_active=1 ORDER BY id DESC",
      )
      .all(),
  }),
);
router.post("/", requireRole("manager"), (req, res) => {
  const { product: p, error } = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });
  // Tham số ? tách dữ liệu người nhập khỏi câu lệnh SQL.
  const result = db
    .prepare(
      `INSERT INTO products
    (name,category,price,unit,stock,image,origin,tag,description)
    VALUES(?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      p.name,
      p.category,
      p.price,
      p.unit,
      p.stock,
      p.image,
      p.origin,
      p.tag,
      p.description,
    );
  res.status(201).json({ product: read(Number(result.lastInsertRowid)) });
});
router.put("/:id", requireRole("manager"), (req, res) => {
  const current = read(req.params.id);
  if (!current) return missing(res);
  const { product: p, error } = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });
  if (
    !Number.isInteger(req.body.expectedRevision) ||
    req.body.expectedRevision !== current.revision
  )
    return conflict(res);
  const result = db
    .prepare(
      `UPDATE products SET name=?,category=?,price=?,unit=?,stock=?,
    image=?,origin=?,tag=?,description=?,revision=revision+1 WHERE id=? AND revision=?`,
    )
    .run(
      p.name,
      p.category,
      p.price,
      p.unit,
      p.stock,
      p.image,
      p.origin,
      p.tag,
      p.description,
      current.id,
      current.revision,
    );
  if (!result.changes) return conflict(res);
  res.json({ product: read(current.id) });
});
router.patch("/:id", requireRole("staff", "manager"), (req, res) => {
  const { price, stock, expectedRevision } = req.body || {};
  if (
    !Number.isInteger(price) ||
    price < 1000 ||
    price > 100000000 ||
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 1000000
  )
    return res.status(400).json({
      message:
        "Giá từ 1.000–100.000.000đ; tồn kho từ 0–1.000.000. Nhập số nguyên.",
    });
  const current = read(req.params.id);
  if (!current?.is_active) return missing(res);
  if (expectedRevision !== undefined && expectedRevision !== current.revision)
    return conflict(res);
  const result = db
    .prepare(
      "UPDATE products SET price=?,stock=?,revision=revision+1 WHERE id=? AND revision=?",
    )
    .run(price, stock, current.id, current.revision);
  if (!result.changes) return conflict(res);
  res.json({ product: read(current.id) });
});
router.delete("/:id", requireRole("manager"), (req, res) => {
  const current = read(req.params.id);
  if (!current) return missing(res);
  if (!current.is_active) return res.json({ product: current });
  if (req.body?.expectedRevision !== current.revision) return conflict(res);
  // Xóa khỏi cửa hàng, giữ bản ghi để đơn hàng/hóa đơn cũ vẫn hoạt động.
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = db
      .prepare(
        "UPDATE products SET is_active=0,revision=revision+1 WHERE id=? AND revision=?",
      )
      .run(current.id, current.revision);
    if (!result.changes) {
      db.exec("ROLLBACK");
      return conflict(res);
    }
    db.prepare("DELETE FROM cart WHERE product_id=?").run(current.id);
    db.prepare("DELETE FROM favorites WHERE product_id=?").run(current.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  res.json({ product: read(current.id) });
});
router.post("/:id/restore", requireRole("manager"), (req, res) => {
  const current = read(req.params.id);
  if (!current) return missing(res);
  if (req.body?.expectedRevision !== current.revision) return conflict(res);
  const result = db
    .prepare(
      "UPDATE products SET is_active=1,revision=revision+1 WHERE id=? AND revision=?",
    )
    .run(current.id, current.revision);
  if (!result.changes) return conflict(res);
  res.json({ product: read(current.id) });
});
export default router;

import { Router } from "express";
import { db } from "../database.js";
import { requireRole } from "../security.js";
const router = Router();
const read = () =>
  db
    .prepare(
      `SELECT c.*,COUNT(p.id) AS totalProducts,
  COALESCE(SUM(CASE WHEN p.is_active=1 THEN 1 ELSE 0 END),0) AS productCount
  FROM categories c LEFT JOIN products p ON p.category=c.id
  GROUP BY c.id ORDER BY c.sort_order,c.name`,
    )
    .all();
const slug = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function validate(body = {}) {
  const { name, description = "", sort_order = 0 } = body || {};
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80 ||
    typeof description !== "string" ||
    description.length > 250 ||
    !Number.isInteger(sort_order) ||
    sort_order < 0 ||
    sort_order > 999
  )
    return {
      error:
        "Tên danh mục 2–80 ký tự, mô tả tối đa 250 ký tự và thứ tự từ 0–999.",
    };
  return {
    category: {
      name: name.trim(),
      description: description.trim(),
      sort_order,
    },
  };
}
router.get("/", (req, res) => res.json({ categories: read() }));
router.post("/", requireRole("manager"), (req, res) => {
  const { category, error } = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  const id = slug(category.name);
  if (!id || id.length > 80 || id === "all")
    return res
      .status(400)
      .json({
        message: "Tên danh mục cần chứa chữ hoặc số; không dùng tên All.",
      });
  if (
    db
      .prepare("SELECT id FROM categories WHERE id=? OR name=?")
      .get(id, category.name)
  )
    return res
      .status(409)
      .json({ message: "Danh mục có tên hoặc mã tương tự đã tồn tại." });
  db.prepare(
    "INSERT INTO categories(id,name,description,sort_order) VALUES(?,?,?,?)",
  ).run(id, category.name, category.description, category.sort_order);
  res.status(201).json({ category: read().find((c) => c.id === id) });
});
router.put("/:id", requireRole("manager"), (req, res) => {
  const current = db
    .prepare("SELECT * FROM categories WHERE id=?")
    .get(req.params.id);
  if (!current)
    return res.status(404).json({ message: "Không tìm thấy danh mục." });
  const { category, error } = validate(req.body);
  if (error) return res.status(400).json({ message: error });
  if (req.body.expectedRevision !== current.revision)
    return res
      .status(409)
      .json({ message: "Danh mục vừa thay đổi. Hãy tải lại trước khi sửa." });
  if (
    db
      .prepare("SELECT id FROM categories WHERE name=? AND id!=?")
      .get(category.name, current.id)
  )
    return res.status(409).json({ message: "Tên danh mục đã tồn tại." });
  const result = db
    .prepare(
      "UPDATE categories SET name=?,description=?,sort_order=?,revision=revision+1 WHERE id=? AND revision=?",
    )
    .run(
      category.name,
      category.description,
      category.sort_order,
      current.id,
      current.revision,
    );
  if (!result.changes)
    return res
      .status(409)
      .json({ message: "Danh mục vừa thay đổi. Hãy tải lại." });
  res.json({ category: read().find((c) => c.id === current.id) });
});
router.delete("/:id", requireRole("manager"), (req, res) => {
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = db
      .prepare("SELECT * FROM categories WHERE id=?")
      .get(req.params.id);
    const fail = (status, message) => {
      db.exec("ROLLBACK");
      return res.status(status).json({ message });
    };
    if (!current) return fail(404, "Không tìm thấy danh mục.");
    if (req.body?.expectedRevision !== current.revision)
      return fail(409, "Danh mục vừa thay đổi. Hãy tải lại.");
    if (
      db
        .prepare("SELECT id FROM products WHERE category=? LIMIT 1")
        .get(current.id)
    )
      return fail(
        409,
        "Danh mục còn sản phẩm. Hãy chuyển các sản phẩm, kể cả đã xóa, sang danh mục khác trước.",
      );
    db.prepare("DELETE FROM categories WHERE id=?").run(current.id);
    db.exec("COMMIT");
    res.json({ ok: true });
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
});
export default router;

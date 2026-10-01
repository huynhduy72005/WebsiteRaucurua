import { seedProducts } from "../products.js";

// Tạo danh mục động và giữ nguyên danh mục của sản phẩm đã có.
export function migrateCatalog(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_migrations(id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS categories(
      id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      description TEXT NOT NULL DEFAULT '',sort_order INTEGER NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 0);
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (
      !db.prepare("SELECT id FROM app_migrations WHERE id='catalog-v1'").get()
    ) {
      const insertCategory = db.prepare(
        "INSERT OR IGNORE INTO categories(id,name,description,sort_order) VALUES(?,?,?,?)",
      );
      insertCategory.run("rau", "Rau xanh", "Thêm xanh cho bữa ăn mỗi ngày", 1);
      insertCategory.run(
        "cu",
        "Củ & hạt",
        "Đa dạng nguyên liệu cho căn bếp",
        2,
      );
      insertCategory.run("qua", "Trái cây", "Một chút ngọt lành theo mùa", 3);
      const insert = db.prepare(
        "INSERT OR IGNORE INTO products(id,name,category,price,unit,stock,image,origin,tag,description) VALUES(?,?,?,?,?,?,?,?,?,?)",
      );
      for (const p of seedProducts)
        insert.run(
          p.id,
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
      db.prepare("INSERT INTO app_migrations(id) VALUES('catalog-v1')").run();
    }
    // Nếu Database cũ có nhóm riêng, bổ sung nhóm đó thay vì mất sản phẩm.
    db.exec(`INSERT OR IGNORE INTO categories(id,name)
      SELECT DISTINCT category,category FROM products
      WHERE category NOT IN (SELECT id FROM categories);`);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  // SQLite kiểm tra quan hệ cả khi có nhiều yêu cầu cùng lúc.
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS product_category_insert BEFORE INSERT ON products
    WHEN NOT EXISTS(SELECT 1 FROM categories WHERE id=NEW.category)
    BEGIN SELECT RAISE(ABORT,'Danh muc khong ton tai'); END;
    CREATE TRIGGER IF NOT EXISTS product_category_update BEFORE UPDATE OF category ON products
    WHEN NOT EXISTS(SELECT 1 FROM categories WHERE id=NEW.category)
    BEGIN SELECT RAISE(ABORT,'Danh muc khong ton tai'); END;
    CREATE TRIGGER IF NOT EXISTS category_delete_guard BEFORE DELETE ON categories
    WHEN EXISTS(SELECT 1 FROM products WHERE category=OLD.id)
    BEGIN SELECT RAISE(ABORT,'Danh muc dang co san pham'); END;
  `);
}

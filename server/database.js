import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { migrateCatalog } from "./migrations/catalog.js";
const path = process.env.DB_PATH || resolve("server/data/shop.sqlite");
if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
export const db = new DatabaseSync(path);
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','staff','manager')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL CHECK(price>=0), unit TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0), image TEXT NOT NULL, origin TEXT NOT NULL, tag TEXT NOT NULL, description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cart(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id) ON DELETE CASCADE, quantity INTEGER NOT NULL CHECK(quantity>0), PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
// Các bảng mới được tạo bổ sung; không xóa tài khoản hay dữ liệu cũ.
db.exec(`
CREATE TABLE IF NOT EXISTS favorites(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS shop_settings(id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), checkout_key TEXT NOT NULL, request_hash TEXT NOT NULL, recipient TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, note TEXT NOT NULL, subtotal INTEGER NOT NULL, shipping_fee INTEGER NOT NULL, total INTEGER NOT NULL, payment_method TEXT NOT NULL CHECK(payment_method IN ('cod','bank','vnpay')), payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','failed')), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','shipping','delivered','cancelled')), store_snapshot TEXT NOT NULL, bank_snapshot TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, paid_at TEXT, payment_reference TEXT, UNIQUE(user_id,checkout_key));
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), name TEXT NOT NULL, unit TEXT NOT NULL, image TEXT NOT NULL, price INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0));
CREATE TABLE IF NOT EXISTS order_history(id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), status TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS payment_attempts(id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed')), payment_url TEXT NOT NULL, transaction_no TEXT UNIQUE, response_code TEXT, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id,created_at);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS payment_order_idx ON payment_attempts(order_id);
`);
// Nâng cấp Database cũ tại chỗ. Không xóa dữ liệu đã lưu.
const productColumns = db.prepare("PRAGMA table_info(products)").all();
if (!productColumns.some((column) => column.name === "is_active"))
  db.exec(
    "ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))",
  );
if (!productColumns.some((column) => column.name === "revision"))
  db.exec(
    "ALTER TABLE products ADD COLUMN revision INTEGER NOT NULL DEFAULT 0",
  );
const userColumns = db.prepare("PRAGMA table_info(users)").all();
for (const field of ["phone", "address"])
  if (!userColumns.some((column) => column.name === field))
    db.exec(`ALTER TABLE users ADD COLUMN ${field} TEXT NOT NULL DEFAULT ''`);
migrateCatalog(db);
db.exec(`CREATE TABLE IF NOT EXISTS inquiries(
  id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),name TEXT NOT NULL,
  email TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','resolved')),
  reply TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE INDEX IF NOT EXISTS inquiries_user_idx ON inquiries(user_id,created_at);`);
export const publicUser = (u) =>
  u
    ? {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone || "",
        address: u.address || "",
        created_at: u.created_at,
      }
    : null;
export function notify(userId, title, message) {
  db.prepare(
    "INSERT INTO notifications(user_id,title,message) VALUES (?,?,?)",
  ).run(userId, title, message);
}

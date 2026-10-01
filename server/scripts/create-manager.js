import { createInterface } from "node:readline/promises";
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
const { db } = await import("../database.js");
const { hashPassword } = await import("../security.js");
const rl = createInterface({ input: process.stdin, output: process.stdout });
try {
  console.log(
    "Tạo tài khoản quản lý. Chạy lệnh này trên máy giữ cơ sở dữ liệu.",
  );
  const name = (await rl.question("Họ tên: ")).trim();
  const email = (await rl.question("Email: ")).trim().toLowerCase();
  const password = await rl.question(
    "Mật khẩu mới (8–128 ký tự, nhập tại máy cá nhân): ",
  );
  if (
    !name ||
    name.length > 80 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 8 ||
    password.length > 128
  )
    throw new Error(
      "Thông tin không hợp lệ. Tên tối đa 80 ký tự; mật khẩu 8–128 ký tự.",
    );
  if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
    throw new Error(
      "Email đã tồn tại. Dùng trang quản lý để thay đổi quyền hoặc tạo quản lý bằng email mới.",
    );
  db.prepare(
    "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'manager')",
  ).run(name, email, await hashPassword(password));
  console.log("Đã tạo quản lý. Bạn có thể đăng nhập trên website.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  db.close();
}

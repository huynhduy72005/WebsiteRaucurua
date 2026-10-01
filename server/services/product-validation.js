import { db } from "../database.js";
// Kiểm tra dữ liệu tại máy chủ, kể cả khi người dùng bỏ qua form React.
export function validateProduct(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { error: "Thông tin sản phẩm không hợp lệ." };
  const product = {};
  for (const [field, min, max, label] of [
    ["name", 2, 120, "Tên sản phẩm"],
    ["unit", 1, 30, "Đơn vị bán"],
    ["origin", 2, 120, "Xuất xứ"],
    ["tag", 0, 40, "Nhãn sản phẩm"],
    ["description", 10, 4000, "Mô tả"],
    ["image", 1, 1000, "Đường dẫn ảnh"],
  ]) {
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (value.length < min || value.length > max)
      return { error: `${label} cần có ${min}–${max} ký tự.` };
    product[field] = value;
  }
  if (
    typeof body.category !== "string" ||
    !db.prepare("SELECT id FROM categories WHERE id=?").get(body.category)
  )
    return { error: "Chọn danh mục đang tồn tại trong cửa hàng." };
  product.category = body.category;
  if (
    !Number.isInteger(body.price) ||
    body.price < 1000 ||
    body.price > 100000000 ||
    !Number.isInteger(body.stock) ||
    body.stock < 0 ||
    body.stock > 1000000
  )
    return {
      error:
        "Giá từ 1.000–100.000.000đ; tồn kho từ 0–1.000.000. Nhập số nguyên.",
    };
  product.price = body.price;
  product.stock = body.stock;
  // Ảnh nội bộ ở public/images hoặc URL HTTPS. Không nhận mã HTML/data URL.
  const localImage =
    /^\/images\/[a-zA-Z0-9_./-]+\.(jpe?g|png|webp|gif|avif)$/i.test(
      product.image,
    ) && !product.image.split("/").includes("..");
  let remoteImage = false;
  try {
    const url = new URL(product.image);
    remoteImage = url.protocol === "https:" && !url.username && !url.password;
  } catch {
    /* Đường dẫn nội bộ không phải URL tuyệt đối. */
  }
  if (!localImage && !remoteImage)
    return {
      error:
        "Ảnh cần là đường dẫn /images/ten-anh.jpg hoặc URL https:// hợp lệ.",
    };
  return { product };
}

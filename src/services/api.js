// Một nơi duy nhất gửi yêu cầu đến máy chủ. Mật khẩu không lưu ở trình duyệt.
export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error(
      "Không kết nối được máy chủ. Kiểm tra bạn đã chạy npm run dev.",
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.message || "Yêu cầu chưa thành công. Vui lòng thử lại.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
export const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
export const roleNames = {
  customer: "Khách hàng",
  staff: "Nhân viên",
  manager: "Quản lý",
};
// Dùng cho mọi danh sách lọc; các danh mục còn lại được đọc từ Database.
export const allCategory = { id: "all", name: "Tất cả" };
export const normalizeText = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");

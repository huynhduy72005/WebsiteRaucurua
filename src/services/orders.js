export const orderStatuses = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};
export const paymentStatuses = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán chưa thành công",
};
export const paymentMethods = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank: "Chuyển khoản ngân hàng",
  vnpay: "Thanh toán online qua VNPay",
};
export function formatDate(value) {
  return new Date(value.replace(" ", "T") + "Z").toLocaleString("vi-VN");
}
export async function downloadInvoice(orderId) {
  const response = await fetch(`/api/orders/${orderId}/invoice`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Không tải được hóa đơn.");
  }
  const blob = await response.blob(),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `Hoa-don-${orderId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

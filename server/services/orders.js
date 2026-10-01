import { db, notify } from "../database.js";
export const statusNames = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};
export function orderDetail(id) {
  const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (!order) return null;
  return {
    ...order,
    store_snapshot: JSON.parse(order.store_snapshot),
    bank_snapshot: JSON.parse(order.bank_snapshot),
    items: db
      .prepare("SELECT * FROM order_items WHERE order_id=? ORDER BY id")
      .all(id),
    history: db
      .prepare(
        "SELECT status,message,created_at FROM order_history WHERE order_id=? ORDER BY id",
      )
      .all(id),
  };
}
export function canReadOrder(user, order) {
  return (
    user &&
    (order.user_id === user.id || ["staff", "manager"].includes(user.role))
  );
}
export function history(orderId, status, message) {
  db.prepare(
    "INSERT INTO order_history(order_id,status,message) VALUES(?,?,?)",
  ).run(orderId, status, message);
}
export function cancelOrder(order) {
  if (order.status !== "pending" || order.payment_status === "paid")
    throw Object.assign(
      new Error("Chỉ hủy được đơn chưa xác nhận và chưa thanh toán."),
      { status: 409 },
    );
  if (
    db
      .prepare(
        "SELECT id FROM payment_attempts WHERE order_id=? AND status='pending'",
      )
      .get(order.id)
  )
    throw Object.assign(
      new Error(
        "Giao dịch VNPay đang chờ kết quả. Vui lòng chờ cổng thanh toán xác nhận trước khi hủy.",
      ),
      { status: 409 },
    );
  db.exec("BEGIN IMMEDIATE");
  try {
    const changed = db
      .prepare(
        "UPDATE orders SET status='cancelled' WHERE id=? AND status='pending' AND payment_status!='paid'",
      )
      .run(order.id);
    if (!changed.changes)
      throw Object.assign(
        new Error("Trạng thái đơn đã thay đổi. Vui lòng tải lại."),
        { status: 409 },
      );
    for (const item of db
      .prepare("SELECT product_id,quantity FROM order_items WHERE order_id=?")
      .all(order.id))
      db.prepare(
        "UPDATE products SET stock=stock+?,revision=revision+1 WHERE id=?",
      ).run(item.quantity, item.product_id);
    history(
      order.id,
      "cancelled",
      "Đơn hàng đã hủy; số lượng được hoàn lại vào kho.",
    );
    notify(order.user_id, "Đơn hàng đã hủy", `Đơn ${order.id} đã được hủy.`);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

import { db } from "../database.js";
export function validateRange(from, to) {
  const validDate = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
  if (!validDate(from) || !validDate(to)) return false;
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  return days >= 0 && days < 366;
}
export function revenueReport(from, to) {
  // Ngày thanh toán theo giờ Việt Nam. Đơn chưa trả tiền/đã hủy không tính.
  const paidWhere =
    "o.payment_status='paid' AND o.status!='cancelled' AND date(o.paid_at,'+7 hours') BETWEEN ? AND ?";
  const summary = db
    .prepare(
      `SELECT COUNT(*) AS paidOrders,
    COALESCE(SUM(o.subtotal),0) AS productRevenue,
    COALESCE(SUM(o.shipping_fee),0) AS shippingCollected,
    COALESCE(SUM(o.total),0) AS collectedTotal
    FROM orders o WHERE ${paidWhere}`,
    )
    .get(from, to);
  const created = db
    .prepare(
      `SELECT COUNT(*) AS createdOrders,
    COALESCE(SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END),0) AS cancelledOrders,
    COALESCE(SUM(CASE WHEN status!='cancelled' AND payment_status!='paid' THEN 1 ELSE 0 END),0) AS unpaidOrders
    FROM orders WHERE date(created_at,'+7 hours') BETWEEN ? AND ?`,
    )
    .get(from, to);
  const inventory = db
    .prepare(
      `SELECT COUNT(*) AS activeProducts,
    COALESCE(SUM(stock),0) AS unitsInStock,
    COALESCE(SUM(CASE WHEN stock=0 THEN 1 ELSE 0 END),0) AS outOfStock,
    COALESCE(SUM(CASE WHEN stock BETWEEN 1 AND 10 THEN 1 ELSE 0 END),0) AS lowStock
    FROM products WHERE is_active=1`,
    )
    .get();
  const rows = db
    .prepare(
      `SELECT date(o.paid_at,'+7 hours') AS day,COUNT(*) AS orders,
    SUM(o.subtotal) AS revenue FROM orders o WHERE ${paidWhere} GROUP BY day ORDER BY day`,
    )
    .all(from, to);
  const days = [];
  for (let time = Date.parse(from); time <= Date.parse(to); time += 86400000) {
    const day = new Date(time).toISOString().slice(0, 10);
    days.push(
      rows.find((r) => r.day === day) || { day, orders: 0, revenue: 0 },
    );
  }
  const topProducts = db
    .prepare(
      `SELECT i.product_id AS id,i.name,i.unit,
    SUM(i.quantity) AS quantity,SUM(i.price*i.quantity) AS revenue
    FROM order_items i JOIN orders o ON o.id=i.order_id WHERE ${paidWhere}
    GROUP BY i.product_id,i.name,i.unit ORDER BY revenue DESC,quantity DESC LIMIT 5`,
    )
    .all(from, to);
  const paymentMethods = db
    .prepare(
      `SELECT o.payment_method AS method,COUNT(*) AS orders,
    SUM(o.total) AS collected FROM orders o WHERE ${paidWhere} GROUP BY o.payment_method`,
    )
    .all(from, to);
  return {
    from,
    to,
    timezone: "Asia/Ho_Chi_Minh",
    summary: { ...summary, ...created },
    inventory,
    days,
    topProducts,
    paymentMethods,
  };
}

import { Router } from "express";
import { randomUUID, createHash } from "node:crypto";
import { db, notify } from "../database.js";
import { requireUser, requireRole } from "../security.js";
import {
  getSettings,
  bankReady,
  vnpayReady,
  shippingFee,
} from "../services/settings.js";
import {
  orderDetail,
  canReadOrder,
  history,
  cancelOrder,
  statusNames,
} from "../services/orders.js";
import { invoiceBuffer } from "../services/invoice.js";
const router = Router();
router.use(requireUser);
router.get("/", (req, res) => {
  const all = req.query.scope === "all";
  if (all && !["staff", "manager"].includes(req.user.role))
    return res
      .status(403)
      .json({ message: "Bạn không có quyền xem đơn của khách khác." });
  const orders = all
    ? db
        .prepare(
          "SELECT * FROM orders ORDER BY created_at DESC,id DESC LIMIT 200",
        )
        .all()
    : db
        .prepare(
          "SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 200",
        )
        .all(req.user.id);
  res.json({
    orders: orders.map((o) => ({
      ...o,
      store_snapshot: undefined,
      bank_snapshot: undefined,
      request_hash: undefined,
      checkout_key: undefined,
    })),
  });
});
router.post("/", (req, res) => {
  const {
    recipient,
    phone,
    address,
    note = "",
    paymentMethod,
    checkoutKey,
    items: expected,
    expectedTotal,
  } = req.body;
  if (!Number.isSafeInteger(expectedTotal) || expectedTotal < 0)
    return res
      .status(400)
      .json({ message: "Tổng tiền xác nhận không hợp lệ." });
  if (
    typeof recipient !== "string" ||
    !recipient.trim() ||
    recipient.trim().length > 80 ||
    typeof phone !== "string" ||
    !/^\+?[0-9 .()-]{8,20}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 8 ||
    typeof address !== "string" ||
    address.trim().length < 10 ||
    address.trim().length > 300 ||
    typeof note !== "string" ||
    note.length > 500 ||
    !["cod", "bank", "vnpay"].includes(paymentMethod) ||
    typeof checkoutKey !== "string" ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(checkoutKey) ||
    !Array.isArray(expected) ||
    !expected.length ||
    expected.length > 100 ||
    expected.some(
      (i) =>
        !i ||
        typeof i !== "object" ||
        !Number.isInteger(i.id) ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > 999 ||
        !Number.isInteger(i.price) ||
        i.price < 0,
    )
  )
    return res.status(400).json({
      message: "Kiểm tra họ tên, số điện thoại, địa chỉ và sản phẩm trong đơn.",
    });
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        recipient: recipient.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim(),
        paymentMethod,
        expectedTotal,
        items: [...expected].sort((a, b) => a.id - b.id),
      }),
    )
    .digest("hex");
  const existing = db
    .prepare("SELECT * FROM orders WHERE user_id=? AND checkout_key=?")
    .get(req.user.id, checkoutKey);
  if (existing) {
    if (existing.request_hash !== requestHash)
      return res.status(409).json({
        message:
          "Yêu cầu này đã tạo đơn với thông tin khác. Vui lòng tải lại trang.",
      });
    return res.json({ order: orderDetail(existing.id) });
  }
  const settings = getSettings();
  if (paymentMethod === "bank" && !bankReady(settings))
    return res
      .status(409)
      .json({ message: "Cửa hàng chưa thiết lập tài khoản chuyển khoản." });
  if (paymentMethod === "vnpay" && !vnpayReady())
    return res
      .status(409)
      .json({ message: "Cửa hàng chưa kết nối VNPay. Bạn có thể chọn COD." });
  db.exec("BEGIN IMMEDIATE");
  let id;
  try {
    const cart = db
      .prepare(
        "SELECT p.*,c.quantity FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=? AND p.is_active=1 ORDER BY p.id",
      )
      .all(req.user.id);
    if (!cart.length)
      throw Object.assign(new Error("Giỏ hàng đang trống."), { status: 409 });
    if (
      cart.length !== expected.length ||
      cart.some((p, index) => {
        const i = [...expected].sort((a, b) => a.id - b.id)[index];
        return (
          p.id !== i.id || p.quantity !== i.quantity || p.price !== i.price
        );
      })
    )
      throw Object.assign(
        new Error(
          "Giá hoặc giỏ hàng đã thay đổi. Vui lòng tải lại để xem tổng tiền mới.",
        ),
        { status: 409 },
      );
    const subtotal = cart.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const fee = shippingFee(subtotal, settings),
      total = subtotal + fee;
    if (total !== expectedTotal)
      throw Object.assign(
        new Error(
          "Phí giao hàng hoặc tổng tiền đã thay đổi. Vui lòng kiểm tra lại trước khi đặt.",
        ),
        { status: 409 },
      );
    if (!Number.isSafeInteger(total) || total > 9999999999)
      throw Object.assign(
        new Error("Giá trị đơn vượt giới hạn. Vui lòng giảm số lượng."),
        { status: 400 },
      );
    id =
      "VN" +
      Date.now().toString(36).toUpperCase() +
      randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
    db.prepare(
      "INSERT INTO orders(id,user_id,checkout_key,request_hash,recipient,phone,address,note,subtotal,shipping_fee,total,payment_method,store_snapshot,bank_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      req.user.id,
      checkoutKey,
      requestHash,
      recipient.trim(),
      phone.trim(),
      address.trim(),
      note.trim(),
      subtotal,
      fee,
      total,
      paymentMethod,
      JSON.stringify({
        name: settings.storeName,
        address: settings.storeAddress,
        phone: settings.storePhone,
      }),
      JSON.stringify(
        paymentMethod === "bank"
          ? {
              name: settings.bankName,
              account: settings.bankAccount,
              holder: settings.bankHolder,
            }
          : {},
      ),
    );
    for (const p of cart) {
      const changed = db
        .prepare(
          "UPDATE products SET stock=stock-?,revision=revision+1 WHERE id=? AND is_active=1 AND stock>=?",
        )
        .run(p.quantity, p.id, p.quantity);
      if (!changed.changes)
        throw Object.assign(
          new Error(
            `${p.name} không còn đủ số lượng. Vui lòng cập nhật giỏ hàng.`,
          ),
          { status: 409 },
        );
      db.prepare(
        "INSERT INTO order_items(order_id,product_id,name,unit,image,price,quantity) VALUES(?,?,?,?,?,?,?)",
      ).run(id, p.id, p.name, p.unit, p.image, p.price, p.quantity);
    }
    db.prepare("DELETE FROM cart WHERE user_id=?").run(req.user.id);
    history(id, "pending", "Đã đặt đơn hàng và giữ số lượng trong kho.");
    notify(
      req.user.id,
      "Đặt hàng thành công",
      `Đơn ${id} đã được tạo. Bạn có thể xem chi tiết trong Đơn hàng.`,
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  res.status(201).json({ order: orderDetail(id) });
});
router.get("/:id", (req, res) => {
  const order = orderDetail(req.params.id);
  if (!order || !canReadOrder(req.user, order))
    return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
  res.json({
    order: { ...order, request_hash: undefined, checkout_key: undefined },
  });
});
router.get("/:id/invoice", async (req, res) => {
  const order = orderDetail(req.params.id);
  if (!order || !canReadOrder(req.user, order))
    return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
  const pdf = await invoiceBuffer(order);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Hoa-don-${order.id}.pdf"`,
  );
  res.send(pdf);
});
router.post("/:id/cancel", (req, res) => {
  const order = orderDetail(req.params.id);
  if (!order || !canReadOrder(req.user, order))
    return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
  cancelOrder(order);
  res.json({ order: orderDetail(order.id) });
});
router.patch("/:id/status", requireRole("staff", "manager"), (req, res) => {
  const order = orderDetail(req.params.id);
  if (!order)
    return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
  const nextStatus = req.body.status;
  if (nextStatus === "cancelled") {
    cancelOrder(order);
    return res.json({ order: orderDetail(order.id) });
  }
  const next = {
    pending: "confirmed",
    confirmed: "shipping",
    shipping: "delivered",
  }[order.status];
  if (nextStatus !== next)
    return res.status(409).json({
      message:
        "Chỉ chuyển trạng thái theo thứ tự xác nhận → đang giao → đã giao.",
    });
  if (
    order.payment_status !== "paid" &&
    (order.payment_method !== "cod" || nextStatus === "delivered")
  )
    return res.status(409).json({
      message: "Cần xác nhận đã nhận đủ tiền trước khi chuyển trạng thái này.",
    });
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE orders SET status=? WHERE id=?").run(
      nextStatus,
      order.id,
    );
    history(
      order.id,
      nextStatus,
      `${req.user.name}: ${statusNames[nextStatus]}.`,
    );
    notify(
      order.user_id,
      "Đơn hàng được cập nhật",
      `Đơn ${order.id}: ${statusNames[nextStatus]}.`,
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  res.json({ order: orderDetail(order.id) });
});
router.post(
  "/:id/confirm-payment",
  requireRole("staff", "manager"),
  (req, res) => {
    const order = orderDetail(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    if (order.payment_method === "vnpay")
      return res.status(409).json({
        message:
          "VNPay chỉ được xác nhận bằng thông báo đã xác minh từ cổng thanh toán.",
      });
    if (order.status === "cancelled" || order.payment_status === "paid")
      return res
        .status(409)
        .json({ message: "Đơn đã hủy hoặc đã thanh toán." });
    const reference = req.body.reference;
    if (
      typeof reference !== "string" ||
      reference.trim().length < 3 ||
      reference.length > 120
    )
      return res.status(400).json({
        message:
          "Nhập mã giao dịch chuyển khoản hoặc ghi nhận thu tiền COD (3–120 ký tự).",
      });
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(
        "UPDATE orders SET payment_status='paid',paid_at=CURRENT_TIMESTAMP,payment_reference=? WHERE id=?",
      ).run(reference.trim(), order.id);
      history(
        order.id,
        order.status,
        `${req.user.name} xác nhận đã nhận đủ tiền (${reference.trim()}).`,
      );
      notify(
        order.user_id,
        "Đã nhận thanh toán",
        `Cửa hàng đã xác nhận thanh toán cho đơn ${order.id}.`,
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    res.json({ order: orderDetail(order.id) });
  },
);
export default router;

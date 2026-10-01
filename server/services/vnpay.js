import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { db, notify } from "../database.js";
import { vnpayReady } from "./settings.js";
import { history } from "./orders.js";
// VNPay 2.1.0: sắp xếp khóa, mã hóa form URL và ký HMAC-SHA512.
export function signedData(params) {
  return Object.keys(params)
    .filter((key) => key !== "vnp_SecureHash" && key !== "vnp_SecureHashType")
    .sort()
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`,
    )
    .join("&");
}
export function signature(params, secret = process.env.VNPAY_HASH_SECRET) {
  return createHmac("sha512", secret)
    .update(signedData(params), "utf8")
    .digest("hex");
}
export function verify(params) {
  if (
    !vnpayReady() ||
    Object.values(params).some((value) => typeof value !== "string") ||
    typeof params.vnp_SecureHash !== "string" ||
    !/^[a-f0-9]{128}$/i.test(params.vnp_SecureHash)
  )
    return false;
  const expected = Buffer.from(signature(params), "hex"),
    actual = Buffer.from(params.vnp_SecureHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function vnDate(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const data = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${data.year}${data.month}${data.day}${data.hour}${data.minute}${data.second}`;
}
export function createPayment(order, ip) {
  if (!vnpayReady())
    throw Object.assign(new Error("VNPay chưa được cấu hình."), {
      status: 409,
    });
  if (
    order.payment_method !== "vnpay" ||
    order.payment_status === "paid" ||
    order.status === "cancelled"
  )
    throw Object.assign(new Error("Đơn hàng không cần thanh toán VNPay."), {
      status: 409,
    });
  const active = db
    .prepare(
      "SELECT * FROM payment_attempts WHERE order_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1",
    )
    .get(order.id);
  if (active) {
    if (active.expires_at < Date.now())
      throw Object.assign(
        new Error(
          "Giao dịch cũ đã hết thời gian nhưng chưa có kết quả xác nhận. Vui lòng liên hệ cửa hàng để kiểm tra với VNPay.",
        ),
        { status: 409 },
      );
    return active.payment_url;
  }
  const now = new Date(),
    expires = new Date(now.getTime() + 15 * 60000),
    ref = randomUUID().replaceAll("-", "");
  const address = ip?.startsWith("::ffff:") ? ip.slice(7) : ip;
  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_Amount: String(order.total * 100),
    vnp_CreateDate: vnDate(now),
    vnp_ExpireDate: vnDate(expires),
    vnp_CurrCode: "VND",
    vnp_IpAddr: isIP(address) ? address : "127.0.0.1",
    vnp_Locale: "vn",
    vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
    vnp_TxnRef: ref,
  };
  const base = new URL(
    process.env.VNPAY_URL ||
      "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  );
  if (
    base.protocol !== "https:" ||
    !["sandbox.vnpayment.vn", "pay.vnpay.vn"].includes(base.hostname)
  )
    throw Object.assign(new Error("Địa chỉ cổng VNPay không hợp lệ."), {
      status: 500,
    });
  const url =
    base.origin +
    base.pathname +
    "?" +
    signedData(params) +
    "&vnp_SecureHash=" +
    signature(params);
  db.prepare(
    "INSERT INTO payment_attempts(id,order_id,amount,payment_url,expires_at) VALUES(?,?,?,?,?)",
  ).run(ref, order.id, order.total, url, expires.getTime());
  return url;
}
export function processIPN(params) {
  if (!verify(params) || params.vnp_TmnCode !== process.env.VNPAY_TMN_CODE)
    return { RspCode: "97", Message: "Invalid signature" };
  const attempt = db
    .prepare("SELECT * FROM payment_attempts WHERE id=?")
    .get(params.vnp_TxnRef);
  if (!attempt) return { RspCode: "01", Message: "Order not found" };
  if (
    !/^\d{1,12}$/.test(params.vnp_Amount) ||
    Number(params.vnp_Amount) !== attempt.amount * 100 ||
    (params.vnp_CurrCode && params.vnp_CurrCode !== "VND")
  )
    return { RspCode: "04", Message: "Invalid amount" };
  if (attempt.status !== "pending")
    return { RspCode: "02", Message: "Order already confirmed" };
  const success =
    params.vnp_ResponseCode === "00" && params.vnp_TransactionStatus === "00";
  if (
    success &&
    (!params.vnp_TransactionNo || params.vnp_TransactionNo === "0")
  )
    return { RspCode: "99", Message: "Missing transaction reference" };
  const order = db
    .prepare("SELECT * FROM orders WHERE id=?")
    .get(attempt.order_id);
  if (!order || order.status === "cancelled")
    return { RspCode: "01", Message: "Order unavailable" };
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      "UPDATE payment_attempts SET status=?,transaction_no=?,response_code=? WHERE id=?",
    ).run(
      success ? "paid" : "failed",
      success ? params.vnp_TransactionNo : null,
      params.vnp_ResponseCode || "",
      attempt.id,
    );
    if (success) {
      db.prepare(
        "UPDATE orders SET payment_status='paid',payment_reference=?,paid_at=CURRENT_TIMESTAMP WHERE id=? AND payment_status!='paid'",
      ).run(params.vnp_TransactionNo, order.id);
      history(order.id, order.status, "VNPay xác nhận thanh toán thành công.");
      notify(
        order.user_id,
        "Thanh toán thành công",
        `Đơn ${order.id} đã thanh toán qua VNPay.`,
      );
    } else {
      db.prepare(
        "UPDATE orders SET payment_status='failed' WHERE id=? AND payment_status!='paid'",
      ).run(order.id);
      history(
        order.id,
        order.status,
        "VNPay xác nhận giao dịch chưa thành công. Bạn có thể thử lại.",
      );
      notify(
        order.user_id,
        "Thanh toán chưa thành công",
        `Vui lòng kiểm tra lại giao dịch của đơn ${order.id}.`,
      );
    }
    db.exec("COMMIT");
    return { RspCode: "00", Message: "Confirm Success" };
  } catch (e) {
    db.exec("ROLLBACK");
    console.error("VNPay IPN could not be recorded");
    return { RspCode: "99", Message: "Unable to confirm" };
  }
}

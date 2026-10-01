import { Router } from "express";
import { db } from "../database.js";
import { requireUser } from "../security.js";
import { createPayment, processIPN, verify } from "../services/vnpay.js";
const router = Router();
// Callback không cần cookie người dùng; xác thực bằng chữ ký bí mật VNPay.
router.get("/vnpay/ipn", (req, res) => res.json(processIPN(req.query)));
router.get("/vnpay/return", (req, res) => {
  const valid =
    verify(req.query) && req.query.vnp_TmnCode === process.env.VNPAY_TMN_CODE;
  const attempt = valid
    ? db
        .prepare("SELECT * FROM payment_attempts WHERE id=?")
        .get(req.query.vnp_TxnRef)
    : null;
  const amountValid =
    attempt && Number(req.query.vnp_Amount) === attempt.amount * 100;
  const base = new URL(process.env.WEB_ORIGIN || "http://localhost:5173");
  const path =
    valid && amountValid
      ? `/don-hang/${attempt.order_id}?paymentReturn=${req.query.vnp_ResponseCode === "00" && req.query.vnp_TransactionStatus === "00" ? "received" : "failed"}`
      : "/don-hang?paymentReturn=invalid";
  // Return URL chỉ hiển thị kết quả; tuyệt đối không đánh dấu đã trả tiền ở đây.
  res.redirect(base.origin + path);
});
router.post("/vnpay/:orderId", requireUser, (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE id=? AND user_id=?")
    .get(req.params.orderId, req.user.id);
  if (!order)
    return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
  res.json({ url: createPayment(order, req.socket.remoteAddress) });
});
export default router;

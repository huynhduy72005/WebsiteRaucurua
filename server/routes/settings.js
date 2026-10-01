import { Router } from "express";
import { db } from "../database.js";
import { publicSettings } from "../services/settings.js";
import { requireRole } from "../security.js";
const router = Router();
router.get("/", (req, res) => res.json({ settings: publicSettings() }));
router.put("/", requireRole("manager"), (req, res) => {
  const clean = {};
  for (const [key, max] of Object.entries({
    storeName: 80,
    storeAddress: 300,
    storePhone: 30,
    bankName: 100,
    bankAccount: 40,
    bankHolder: 100,
  })) {
    const value = req.body[key];
    if (typeof value !== "string" || value.trim().length > max)
      return res
        .status(400)
        .json({ message: "Thông tin cửa hàng/ngân hàng không hợp lệ." });
    clean[key] = value.trim();
  }
  if (!clean.storeName)
    return res.status(400).json({ message: "Vui lòng nhập tên cửa hàng." });
  const hasBank = [clean.bankName, clean.bankAccount, clean.bankHolder].filter(
    Boolean,
  ).length;
  if (hasBank > 0 && hasBank < 3)
    return res.status(400).json({
      message:
        "Nhập đủ ngân hàng, số tài khoản và chủ tài khoản; hoặc để trống cả ba.",
    });
  for (const key of ["shippingFee", "freeShippingFrom"]) {
    if (
      !Number.isInteger(req.body[key]) ||
      req.body[key] < 0 ||
      req.body[key] > 100000000
    )
      return res.status(400).json({
        message:
          "Phí giao hàng và ngưỡng miễn phí phải là số nguyên từ 0–100.000.000đ.",
      });
    clean[key] = req.body[key];
  }
  db.prepare("UPDATE shop_settings SET value=? WHERE id=1").run(
    JSON.stringify(clean),
  );
  res.json({ settings: publicSettings() });
});
export default router;

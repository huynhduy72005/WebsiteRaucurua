import { Router } from "express";
import { requireRole } from "../security.js";
import { validateRange, revenueReport } from "../services/revenue.js";
const router = Router();
router.use(requireRole("manager"));
router.get("/revenue", (req, res) => {
  const { from, to } = req.query;
  if (!validateRange(from, to))
    return res.status(400).json({
      message:
        "Chọn ngày bắt đầu/kết thúc hợp lệ, tối đa 366 ngày; ngày kết thúc không trước ngày bắt đầu.",
    });
  res.json({ report: revenueReport(from, to) });
});
export default router;

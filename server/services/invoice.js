import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
const regular = fileURLToPath(
  new URL("../assets/DejaVuSans.ttf", import.meta.url),
);
const bold = fileURLToPath(
  new URL("../assets/DejaVuSans-Bold.ttf", import.meta.url),
);
const money = (value) => new Intl.NumberFormat("vi-VN").format(value) + " đ";
const paymentNames = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank: "Chuyển khoản ngân hàng",
  vnpay: "Thanh toán online qua VNPay",
};
const paymentStatus = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán chưa thành công",
};
const orderStatus = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};
export function invoiceBuffer(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 46,
      bufferPages: true,
      info: { Title: `Hóa đơn ${order.id}`, Author: order.store_snapshot.name },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("Regular", regular);
    doc.registerFont("Bold", bold);
    const width = doc.page.width - 92;
    const green = "#246b45";
    function text(value, x, y, size = 10, options = {}) {
      doc
        .font("Regular")
        .fontSize(size)
        .fillColor("#263a2c")
        .text(String(value), x, y, options);
    }
    function label(value, x, y, size = 10, options = {}) {
      doc
        .font("Bold")
        .fontSize(size)
        .fillColor("#263a2c")
        .text(String(value), x, y, options);
    }
    doc
      .font("Bold")
      .fontSize(22)
      .fillColor(green)
      .text(order.store_snapshot.name, 46, 43, { width });
    let y = doc.y + 8;
    for (const line of [
      order.store_snapshot.address,
      order.store_snapshot.phone,
    ].filter(Boolean)) {
      text(line, 46, y, 9, { width });
      y = doc.y + 5;
    }
    y = Math.max(y, 105);
    doc
      .moveTo(46, y)
      .lineTo(46 + width, y)
      .lineWidth(1)
      .strokeColor("#dce7db")
      .stroke();
    y += 22;
    label("HÓA ĐƠN ĐƠN HÀNG", 46, y, 19, { width });
    y = doc.y + 10;
    text(`Mã đơn: ${order.id}`, 46, y, 9, { width });
    y = doc.y + 5;
    text(
      `Ngày đặt: ${new Date(order.created_at.replace(" ", "T") + "Z").toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`,
      46,
      y,
      9,
      { width },
    );
    y = doc.y + 5;
    text(
      `Trạng thái đơn: ${orderStatus[order.status] || "Đơn kiểm thử"}`,
      46,
      y,
      9,
      { width },
    );
    y = doc.y + 5;
    text(
      `Trạng thái thanh toán: ${paymentStatus[order.payment_status]}`,
      46,
      y,
      9,
      { width },
    );
    y = doc.y + 20;
    label("THÔNG TIN NGƯỜI NHẬN", 46, y, 10, { width });
    y = doc.y + 8;
    for (const line of [
      order.recipient,
      `Điện thoại: ${order.phone}`,
      `Địa chỉ: ${order.address}`,
    ]) {
      text(line, 46, y, 10, { width });
      y = doc.y + 6;
    }
    y += 14;
    const columns = [46, 78, 303, 350, 402, 476];
    const sizes = [26, 214, 40, 45, 69, 73];
    function header() {
      doc.roundedRect(46, y, width, 30, 3).fill("#edf4eb");
      [
        "STT",
        "Sản phẩm / Quy cách",
        "SL",
        "ĐVT",
        "Đơn giá",
        "Thành tiền",
      ].forEach((s, i) =>
        label(s, columns[i] + 4, y + 9, 8, {
          width: sizes[i] - 8,
          align: i >= 4 ? "right" : "left",
        }),
      );
      y += 36;
    }
    function newPage() {
      doc.addPage();
      y = 46;
      label(`Đơn hàng ${order.id} - tiếp theo`, 46, y, 11, { width });
      y = doc.y + 17;
      header();
    }
    header();
    order.items.forEach((item, index) => {
      const name = `${item.name}\n${item.unit} / đơn vị`;
      const height = Math.max(
        42,
        doc
          .font("Regular")
          .fontSize(9)
          .heightOfString(name, { width: sizes[1] - 8 }) + 16,
      );
      if (y + height > doc.page.height - 115) newPage();
      text(index + 1, columns[0] + 4, y + 6, 9, { width: sizes[0] - 8 });
      text(name, columns[1] + 4, y + 6, 9, { width: sizes[1] - 8 });
      text(item.quantity, columns[2] + 4, y + 6, 9, { width: sizes[2] - 8 });
      text("Gói", columns[3] + 4, y + 6, 9, { width: sizes[3] - 8 });
      text(money(item.price), columns[4] + 4, y + 6, 8, {
        width: sizes[4] - 8,
        align: "right",
      });
      text(money(item.price * item.quantity), columns[5] + 4, y + 6, 8, {
        width: sizes[5] - 8,
        align: "right",
      });
      y += height;
      doc
        .moveTo(46, y)
        .lineTo(46 + width, y)
        .lineWidth(0.5)
        .strokeColor("#e3e8e1")
        .stroke();
      y += 6;
    });
    if (y + 210 > doc.page.height - 70) {
      doc.addPage();
      y = 46;
    }
    y += 16;
    for (const [name, value] of [
      ["Tạm tính", order.subtotal],
      ["Phí giao hàng", order.shipping_fee],
      ["TỔNG CỘNG", order.total],
    ]) {
      const large = name === "TỔNG CỘNG";
      label(name, 303, y, large ? 11 : 9, { width: 120 });
      label(money(value), 423, y, large ? 13 : 10, {
        width: 126,
        align: "right",
      });
      y += large ? 33 : 25;
    }
    text(`Phương thức: ${paymentNames[order.payment_method]}`, 46, y, 9, {
      width,
    });
    y = doc.y + 8;
    if (order.payment_reference) {
      text(`Tham chiếu thanh toán: ${order.payment_reference}`, 46, y, 9, {
        width,
      });
      y = doc.y + 8;
    }
    if (order.note) {
      const noteHeight = doc
        .font("Regular")
        .fontSize(9)
        .heightOfString(`Ghi chú: ${order.note}`, { width });
      if (y + noteHeight > doc.page.height - 100) {
        doc.addPage();
        y = 46;
      }
      text(`Ghi chú: ${order.note}`, 46, y, 9, { width });
    }
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      text(
        "Chứng từ đơn hàng của cửa hàng. Không phải hóa đơn VAT.",
        46,
        doc.page.height - 57,
        8,
        { width: width - 60 },
      );
      text(
        `${i + 1} / ${range.count}`,
        46 + width - 50,
        doc.page.height - 57,
        8,
        { width: 50, align: "right" },
      );
    }
    doc.end();
  });
}

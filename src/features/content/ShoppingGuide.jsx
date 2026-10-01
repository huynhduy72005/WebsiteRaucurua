import { Search, ShoppingBag, Truck, ReceiptText } from "lucide-react";
export const guideSteps = [
  {
    title: "Chọn món bạn thích",
    text: "Tìm theo tên, xuất xứ hoặc danh mục. Xem giá và quy cách ở từng sản phẩm.",
    icon: Search,
  },
  {
    title: "Thêm vào giỏ",
    text: "Chọn số lượng phù hợp; kiểm tra lại món và tổng tiền trước khi đặt.",
    icon: ShoppingBag,
  },
  {
    title: "Đặt hàng & thanh toán",
    text: "Đăng nhập, nhập người nhận và chọn phương thức thanh toán đang được bật.",
    icon: Truck,
  },
  {
    title: "Theo dõi trong tài khoản",
    text: "Xem trạng thái, chi tiết đơn hàng và tải hóa đơn PDF ngay trên website.",
    icon: ReceiptText,
  },
];
export function GuideSteps() {
  return (
    <div className="guide-steps">
      {guideSteps.map(({ title, text, icon: Icon }, index) => (
        <article key={title}>
          <span className="guide-number">0{index + 1}</span>
          <Icon size={25} />
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}
export function ShoppingFAQ() {
  return (
    <div className="shopping-faq">
      <details>
        <summary>Tôi có cần tài khoản để mua hàng không?</summary>
        <p>
          Bạn có thể xem sản phẩm và chọn vào giỏ trước. Cần đăng nhập khi đặt
          hàng để lưu thông tin đơn và theo dõi giao hàng.
        </p>
      </details>
      <details>
        <summary>Phí giao hàng và tổng tiền được tính thế nào?</summary>
        <p>
          Phí giao hàng và ngưỡng miễn phí do cửa hàng cài đặt. Trang thanh toán
          hiển thị tiền sản phẩm, phí giao hàng và tổng tiền trước khi bạn xác
          nhận.
        </p>
      </details>
      <details>
        <summary>Tôi có thể thanh toán bằng cách nào?</summary>
        <p>
          COD, chuyển khoản hoặc VNPay tùy cấu hình cửa hàng. Chuyển khoản/COD
          được nhân viên xác nhận sau khi nhận tiền; VNPay được cập nhật từ cổng
          thanh toán.
        </p>
      </details>
      <details>
        <summary>Tôi xem đơn hàng và hóa đơn ở đâu?</summary>
        <p>
          Vào Tài khoản → Đơn hàng của tôi, mở chi tiết đơn để xem tiến trình và
          tải hóa đơn PDF. File PDF là chứng từ đơn hàng, chưa phải hóa đơn VAT.
        </p>
      </details>
      <details>
        <summary>Tôi có thể hủy đơn không?</summary>
        <p>
          Chỉ hủy được đơn chưa xác nhận và chưa thanh toán. Nếu giao dịch VNPay
          đang chờ kết quả, cần chờ xác nhận từ cổng thanh toán.
        </p>
      </details>
    </div>
  );
}

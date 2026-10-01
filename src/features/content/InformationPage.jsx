import { Link } from "react-router-dom";
import { Search, Heart, ReceiptText } from "lucide-react";
import AboutSection from "./AboutSection";
export default function InformationPage() {
  return (
    <main className="container page content-page">
      <div className="content-page-heading">
        <span className="eyebrow">THÔNG TIN CỬA HÀNG</span>
        <h1>Chọn điều lành cho mỗi ngày.</h1>
        <p>Một góc nhỏ dành cho bữa ăn, căn bếp và những người bạn thương.</p>
      </div>
      <AboutSection />
      <section className="content-values">
        <article>
          <Search size={26} />
          <h3>Thông tin rõ ràng</h3>
          <p>Xem giá, xuất xứ, quy cách và mô tả trước khi chọn mua.</p>
        </article>
        <article>
          <Heart size={26} />
          <h3>Lưu món bạn yêu</h3>
          <p>Một chạm vào trái tim để giữ lại món muốn mua lần sau.</p>
        </article>
        <article>
          <ReceiptText size={26} />
          <h3>Theo dõi thuận tiện</h3>
          <p>
            Thông tin, đơn hàng, lịch sử và hóa đơn trong tài khoản của bạn.
          </p>
        </article>
      </section>
      <div className="content-cta">
        <div>
          <h2>Hôm nay bạn muốn chọn gì?</h2>
          <p>Ghé khu vườn và tìm nguyên liệu cho bữa ăn tiếp theo.</p>
        </div>
        <Link className="button" to="/san-pham">
          Khám phá sản phẩm
        </Link>
      </div>
    </main>
  );
}

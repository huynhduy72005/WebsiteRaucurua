import { Link } from "react-router-dom";
import { GuideSteps, ShoppingFAQ } from "./ShoppingGuide";
export default function GuidePage() {
  return (
    <main className="container page content-page">
      <div className="content-page-heading">
        <span className="eyebrow">MUA SẮM THẬT NHẸ NHÀNG</span>
        <h1>Từ khu vườn đến giỏ hàng.</h1>
        <p>Bốn bước để chọn món, đặt hàng và theo dõi đơn của bạn.</p>
      </div>
      <GuideSteps />
      <section className="faq-section">
        <div>
          <span className="eyebrow">GIẢI ĐÁP NHANH</span>
          <h2>Những điều bạn cần biết</h2>
          <p>Nếu cần hỗ trợ thêm, gửi lời nhắn cho cửa hàng.</p>
          <Link to="/lien-he" className="text-link">
            Liên hệ cửa hàng
          </Link>
        </div>
        <ShoppingFAQ />
      </section>
    </main>
  );
}

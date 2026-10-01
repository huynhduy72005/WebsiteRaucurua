import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Layers3,
  ShoppingBag,
  Leaf,
  MessageCircle,
  BookOpen,
} from "lucide-react";
import { useShop } from "../../context/ShopContext";
import ProductCard from "./ProductCard";
import HeroSection from "./HeroSection";
import CategorySection from "./CategorySection";
import AboutSection from "../content/AboutSection";
import { GuideSteps } from "../content/ShoppingGuide";
import { Loading, ErrorMessage } from "../../components/Feedback";
const shortcuts = [
  { id: "danh-muc", name: "Danh mục", icon: Layers3 },
  { id: "san-pham-noi-bat", name: "Sản phẩm", icon: ShoppingBag },
  { id: "ve-chung-toi", name: "Về chúng tôi", icon: Leaf },
  { id: "cach-mua", name: "Cách mua hàng", icon: BookOpen },
  { id: "ket-noi", name: "Kết nối", icon: MessageCircle },
];
export default function HomePage() {
  const { products, loading, error, loadProducts } = useShop();
  return (
    <main className="container home garden-home">
      <HeroSection />
      <nav className="home-shortcuts" aria-label="Các phần trên trang chủ">
        {shortcuts.map(({ id, name, icon: Icon }) => (
          <Link key={id} to={`/#${id}`}>
            <Icon size={17} />
            {name}
          </Link>
        ))}
      </nav>
      <CategorySection />
      <section className="home-section" id="san-pham-noi-bat">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GHÉ VƯỜN, CHỌN MÓN NGON</span>
            <h2>Một giỏ tươi ngon cho hôm nay</h2>
          </div>
          <Link className="text-link" to="/san-pham">
            Khám phá thêm <ArrowUpRight size={16} />
          </Link>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorMessage message={error} onRetry={loadProducts} />
        ) : products.length ? (
          <div className="product-grid">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="admin-empty">Cửa hàng đang cập nhật sản phẩm.</div>
        )}
      </section>
      <AboutSection />
      <section className="home-section" id="cach-mua">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DỄ CHỌN, DỄ ĐẶT</span>
            <h2>Mua sắm thật nhẹ nhàng</h2>
          </div>
          <Link className="text-link" to="/huong-dan">
            Hướng dẫn chi tiết <ArrowUpRight size={16} />
          </Link>
        </div>
        <GuideSteps />
      </section>
      <section className="garden-connect" id="ket-noi">
        <span className="eyebrow">
          <MessageCircle size={17} /> KẾT NỐI VỚI KHU VƯỜN
        </span>
        <h2>Bạn cần một chút hỗ trợ?</h2>
        <p>
          Hỏi về sản phẩm, theo dõi đơn hàng hoặc gửi lời góp ý.
          <br />
          Chúng tôi luôn sẵn sàng lắng nghe.
        </p>
        <div>
          <Link to="/lien-he" className="button">
            Gửi lời nhắn <ArrowUpRight size={17} />
          </Link>
          <Link to="/tai-khoan" className="button secondary">
            Mở tài khoản của tôi
          </Link>
        </div>
      </section>
    </main>
  );
}

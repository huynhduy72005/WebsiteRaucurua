import { Link } from "react-router-dom";
import { ArrowUpRight, Leaf, Sprout, Heart } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { money } from "../../services/api";
export default function HeroSection() {
  const { products } = useShop(),
    featured =
      products.find((p) => p.category === "rau" && p.stock > 0) || products[0];
  return (
    <section className="garden-hero" id="dau-trang">
      <div className="garden-hero-copy">
        <span className="eyebrow">
          <Sprout size={17} /> CHỌN TƯƠI, SỐNG LÀNH
        </span>
        <h1>
          Mang chút <em>tươi xanh</em>
          <br />
          về căn bếp của bạn.
        </h1>
        <p>
          Từ rau xanh giòn mát đến trái cây ngọt lành.
          <br />
          Chọn nguyên liệu cho bữa ăn mà bạn mong chờ.
        </p>
        <div className="hero-cta-row">
          <Link className="button" to="/san-pham">
            Ghé vườn, chọn món <ArrowUpRight size={18} />
          </Link>
          <Link className="hero-secondary" to="/#ve-chung-toi">
            Câu chuyện khu vườn
          </Link>
        </div>
        <div className="hero-small-note">
          <Heart size={15} /> Một bữa ăn ngon, một ngày nhiều yêu thương.
        </div>
      </div>
      <div className="garden-hero-visual">
        <span className="hero-orbit orbit-one" />
        <span className="hero-orbit orbit-two" />
        <div className="hero-vegetable-disc">
          <img
            src="/images/broccoli.jpg"
            alt="Bông cải xanh cho bữa ăn mỗi ngày"
          />
        </div>
        <div className="hero-fruit-disc">
          <img src="/images/apple.jpg" alt="Táo đỏ" />
        </div>
        <span className="garden-hero-label">
          <Leaf size={22} />
          <span>
            Mỗi ngày một chút xanh<strong>Chọn món theo cách của bạn</strong>
          </span>
        </span>
        {featured && (
          <Link className="hero-product-note" to={`/san-pham/${featured.id}`}>
            <img src={featured.image} alt="" />
            <span>
              <small>Gợi ý hôm nay</small>
              <strong>{featured.name}</strong>
              <b>
                {money(featured.price)} <small>/ {featured.unit}</small>
              </b>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        )}
        <span className="hero-art-caption">A LITTLE GREEN. A LOT OF LOVE.</span>
      </div>
    </section>
  );
}

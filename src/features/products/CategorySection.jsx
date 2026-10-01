import { Link } from "react-router-dom";
import { Leaf, Carrot, Apple, Sprout, ArrowUpRight } from "lucide-react";
import { useShop } from "../../context/ShopContext";
const visuals = {
  rau: { icon: Leaf, image: "/images/broccoli.jpg" },
  cu: { icon: Carrot, image: "/images/carrot.jpg" },
  qua: { icon: Apple, image: "/images/apple.jpg" },
};
export default function CategorySection() {
  const { categories, products } = useShop();
  return (
    <section className="home-section" id="danh-muc">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MỖI MÓN, MỘT CHÚT YÊU THƯƠNG</span>
          <h2>Hôm nay bạn chọn gì?</h2>
        </div>
        <Link className="text-link" to="/san-pham">
          Tất cả sản phẩm <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="garden-category-grid">
        {categories.map((c, i) => {
          const visual = visuals[c.id],
            image =
              visual?.image || products.find((p) => p.category === c.id)?.image,
            Icon = visual?.icon || Sprout;
          return (
            <Link
              key={c.id}
              to={`/san-pham?category=${encodeURIComponent(c.id)}`}
              className={`garden-category-card tone-${i % 3}`}
            >
              <div>
                <span className="category-icon">
                  <Icon size={23} />
                </span>
                <h3>{c.name}</h3>
                <p>{c.description || "Thêm lựa chọn cho bữa ăn"}</p>
                <small>
                  {c.productCount} sản phẩm <ArrowUpRight size={14} />
                </small>
              </div>
              {image ? (
                <img src={image} alt="" loading="lazy" />
              ) : (
                <span className="category-placeholder">
                  <Icon size={70} />
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {!categories.length && (
        <p className="admin-empty">
          Các danh mục sản phẩm sẽ được cập nhật tại đây.
        </p>
      )}
    </section>
  );
}

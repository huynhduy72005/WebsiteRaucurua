import { Heart } from "lucide-react";
import { Navigate, Link } from "react-router-dom";
import { useShop } from "../../context/ShopContext";
import { Loading, ErrorMessage } from "../../components/Feedback";
import ProductCard from "../products/ProductCard";
export default function FavoritesPage() {
  const { user, authReady, products, favorites, loading, error, loadProducts } =
    useShop();
  if (!authReady || loading) return <Loading />;
  if (!user) return <Navigate to="/dang-nhap?next=/yeu-thich" replace />;
  const list = products.filter((p) => favorites.includes(p.id));
  return (
    <main className="container page">
      <div className="page-heading">
        <span className="eyebrow">DÀNH RIÊNG CHO BẠN</span>
        <h1>Sản phẩm yêu thích</h1>
        <p>{list.length} món bạn muốn lưu lại để chọn sau.</p>
      </div>
      {error ? (
        <ErrorMessage message={error} onRetry={loadProducts} />
      ) : list.length ? (
        <div className="product-grid">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={48} />
          <h2>Những món bạn thích sẽ ở đây</h2>
          <p>Nhấn trái tim bên cạnh sản phẩm để lưu vào tài khoản.</p>
          <Link className="button" to="/san-pham">
            Khám phá sản phẩm
          </Link>
        </div>
      )}
    </main>
  );
}

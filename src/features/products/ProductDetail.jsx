import { Link, useParams } from "react-router-dom";
import { ShoppingBag, MapPin, Leaf } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { money } from "../../services/api";
import { Loading, ErrorMessage } from "../../components/Feedback";
import FavoriteButton from "../favorites/FavoriteButton";
export default function ProductDetail() {
  const { id } = useParams();
  const { products, loading, error, loadProducts, addToCart, cartBusy } =
    useShop();
  const p = products.find((p) => p.id === Number(id));
  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={loadProducts} />;
  if (!p)
    return (
      <main className="container page empty-state">
        <h1>Không tìm thấy sản phẩm</h1>
        <Link className="button" to="/san-pham">
          Trở về danh sách
        </Link>
      </main>
    );
  return (
    <main className="container page">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <Link to="/san-pham">Sản phẩm</Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>
      <div className="product-detail">
        <div className="detail-image">
          <img src={p.image} alt={p.name} />
        </div>
        <div className="detail-info">
          <span className="eyebrow">
            <Leaf size={16} /> VƯỜN NHÀ
          </span>
          <h1>{p.name}</h1>
          <span className="origin">
            <MapPin size={16} />
            {p.origin}
          </span>
          <div className="detail-price">
            {money(p.price)}
            <small> / {p.unit}</small>
          </div>
          <p>{p.description}</p>
          <dl>
            <div>
              <dt>Quy cách</dt>
              <dd>{p.unit} / đơn vị</dd>
            </div>
            <div>
              <dt>Tình trạng</dt>
              <dd>{p.stock > 0 ? `Còn ${p.stock} đơn vị` : "Tạm hết hàng"}</dd>
            </div>
          </dl>
          <div className="detail-purchase-actions">
            <button
              className="button"
              disabled={!p.stock || cartBusy}
              onClick={() => addToCart(p)}
            >
              <ShoppingBag size={19} /> Thêm vào giỏ hàng
            </button>
            <FavoriteButton product={p} withLabel />
          </div>
          <Link className="text-link detail-cart-link" to="/gio-hang">
            Xem giỏ hàng của bạn
          </Link>
        </div>
      </div>
    </main>
  );
}

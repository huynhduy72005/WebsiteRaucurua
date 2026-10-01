import { Link } from "react-router-dom";
import { Plus, MapPin } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { money } from "../../services/api";
import FavoriteButton from "../favorites/FavoriteButton";
export default function ProductCard({ product }) {
  const { addToCart, cartBusy } = useShop();
  return (
    <article className="product-card">
      <Link
        to={`/san-pham/${product.id}`}
        className="product-photo"
        aria-label={`Xem ${product.name}`}
      >
        {product.tag && <span className="product-tag">{product.tag}</span>}
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
            e.currentTarget.parentElement.classList.add("image-missing");
          }}
        />
      </Link>
      <FavoriteButton product={product} />
      <div className="product-info">
        <span className="origin">
          <MapPin size={13} />
          {product.origin}
        </span>
        <Link to={`/san-pham/${product.id}`} className="product-name">
          {product.name}
        </Link>
        <div className="product-bottom">
          <span>
            <strong>{money(product.price)}</strong>
            <small> / {product.unit}</small>
          </span>
          <button
            className="add-button"
            disabled={!product.stock || cartBusy}
            aria-label={`Thêm ${product.name} vào giỏ`}
            onClick={() => addToCart(product)}
          >
            <Plus size={21} />
          </button>
        </div>
        {!product.stock && <span className="sold-out">Tạm hết hàng</span>}
      </div>
    </article>
  );
}

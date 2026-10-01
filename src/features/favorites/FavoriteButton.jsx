import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart } from "lucide-react";
import { useShop } from "../../context/ShopContext";
export default function FavoriteButton({ product, withLabel = false }) {
  const { user, favorites, toggleFavorite, showToast } = useShop();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate(),
    location = useLocation();
  const favorite = favorites.includes(product.id);
  async function click() {
    if (!user) {
      navigate(
        `/dang-nhap?next=${encodeURIComponent(location.pathname + location.search)}`,
      );
      return;
    }
    setBusy(true);
    try {
      await toggleFavorite(product);
      showToast(
        favorite
          ? "Đã bỏ khỏi danh sách yêu thích."
          : "Đã lưu sản phẩm yêu thích.",
      );
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      className={`favorite-button ${favorite ? "selected" : ""} ${withLabel ? "with-label" : ""}`}
      type="button"
      disabled={busy}
      aria-pressed={favorite}
      aria-label={`${favorite ? "Bỏ" : "Thêm"} ${product.name} ${favorite ? "khỏi" : "vào"} yêu thích`}
      onClick={click}
    >
      <Heart size={19} fill={favorite ? "currentColor" : "none"} />
      {withLabel && (favorite ? "Đã yêu thích" : "Yêu thích")}
    </button>
  );
}

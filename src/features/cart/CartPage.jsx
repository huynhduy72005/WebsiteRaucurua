import { Link } from "react-router-dom";
import { ShoppingBag, Minus, Plus, Trash2, ShieldCheck } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { money } from "../../services/api";
import { Loading } from "../../components/Feedback";
export default function CartPage() {
  const { items, user, loading, authReady, setQuantity, cartBusy } = useShop();
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0),
    count = items.reduce((s, i) => s + i.quantity, 0);
  function change(p, n) {
    setQuantity(p, n).catch(() => {});
  }
  if (!authReady || loading) return <Loading />;
  return (
    <main className="container page">
      <div className="page-heading">
        <span className="eyebrow">NHỮNG MÓN BẠN ĐÃ CHỌN</span>
        <h1>Giỏ hàng của bạn</h1>
        <p>
          {count
            ? `${count} đơn vị sản phẩm cho bữa ăn sắp tới.`
            : "Giỏ hàng đang đợi những món tươi ngon."}
        </p>
      </div>
      {!items.length ? (
        <div className="empty-state">
          <ShoppingBag size={50} />
          <h2>Chọn một chút xanh nhé?</h2>
          <p>Khám phá rau củ và trái cây để bắt đầu.</p>
          <Link to="/san-pham" className="button">
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <section className="cart-items" aria-label="Sản phẩm trong giỏ">
            {items.map((p) => (
              <article className="cart-item" key={p.id}>
                <Link to={`/san-pham/${p.id}`}>
                  <img src={p.image} alt={p.name} />
                </Link>
                <div className="cart-item-info">
                  <Link to={`/san-pham/${p.id}`}>{p.name}</Link>
                  <small>{p.unit} / đơn vị</small>
                  <span>{money(p.price)}</span>
                  {p.quantity > p.stock && (
                    <span className="stock-warning">
                      Hiện chỉ còn {p.stock}. Vui lòng giảm số lượng hoặc xóa
                      món này.
                    </span>
                  )}
                </div>
                <div className="quantity">
                  <button
                    disabled={cartBusy}
                    aria-label={`Giảm số lượng ${p.name}`}
                    onClick={() => change(p, p.quantity - 1)}
                  >
                    <Minus size={15} />
                  </button>
                  <span aria-live="polite">{p.quantity}</span>
                  <button
                    disabled={
                      cartBusy || p.quantity >= p.stock || p.quantity >= 999
                    }
                    aria-label={`Tăng số lượng ${p.name}`}
                    onClick={() => change(p, p.quantity + 1)}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <strong className="cart-item-total">
                  {money(p.price * p.quantity)}
                </strong>
                <button
                  className="remove-item"
                  disabled={cartBusy}
                  aria-label={`Xóa ${p.name}`}
                  onClick={() => change(p, 0)}
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
            <Link className="text-link" to="/san-pham">
              Tiếp tục chọn sản phẩm
            </Link>
          </section>
          <aside className="cart-summary">
            <h2>Tóm tắt giỏ hàng</h2>
            <div>
              <span>Số đơn vị sản phẩm</span>
              <strong>{count}</strong>
            </div>
            <div className="summary-total">
              <span>Tạm tính</span>
              <strong>{money(total)}</strong>
            </div>
            <p>Giá chưa bao gồm phí giao hàng.</p>
            {!user ? (
              <>
                <Link
                  className="button full-width"
                  to="/dang-nhap?next=/thanh-toan"
                >
                  Đăng nhập để đặt hàng
                </Link>
                <span className="summary-note">
                  Giỏ hiện được lưu trên trình duyệt này.
                </span>
              </>
            ) : (
              <>
                <Link className="button full-width" to="/thanh-toan">
                  Tiến hành thanh toán
                </Link>
                <span className="saved-cart">
                  <ShieldCheck size={18} /> Đã lưu trong tài khoản của bạn
                </span>
              </>
            )}
            <p className="cart-limit">
              Phí giao hàng và tổng thanh toán hiển thị ở bước đặt hàng.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}

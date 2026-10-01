import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Package, RefreshCw } from "lucide-react";
import { api, money } from "../../services/api";
import {
  orderStatuses,
  paymentStatuses,
  formatDate,
} from "../../services/orders";
import { Loading, ErrorMessage } from "../../components/Feedback";
export default function OrdersList({ all = false }) {
  const [orders, setOrders] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("all");
  const [params] = useSearchParams();
  async function load() {
    setLoading(true);
    setError("");
    try {
      setOrders((await api(`/orders${all ? "?scope=all" : ""}`)).orders);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [all]);
  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  const list = orders.filter((o) => filter === "all" || o.status === filter);
  return (
    <section className="orders-area">
      {params.get("paymentReturn") === "invalid" && (
        <div className="form-error">
          Chưa xác minh được kết quả trả về. Vui lòng mở đơn hàng để kiểm tra
          trạng thái thực tế.
        </div>
      )}
      <div className="orders-toolbar">
        <label>
          <span className="sr-only">Lọc trạng thái đơn</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(orderStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary" onClick={load}>
          <RefreshCw size={16} /> Cập nhật
        </button>
      </div>
      {!list.length ? (
        <div className="empty-state">
          <Package size={48} />
          <h2>Chưa có đơn hàng</h2>
          <p>
            {all
              ? "Đơn mới của khách sẽ xuất hiện ở đây."
              : "Những món bạn đặt sẽ được lưu ở đây."}
          </p>
          {!all && (
            <Link className="button" to="/san-pham">
              Chọn sản phẩm
            </Link>
          )}
        </div>
      ) : (
        <div className="order-list">
          {list.map((o) => (
            <Link
              to={`/don-hang/${o.id}`}
              className="order-list-card"
              key={o.id}
            >
              <div>
                <strong>{o.id}</strong>
                <small>
                  {formatDate(o.created_at)}
                  {all ? ` · ${o.recipient}` : ""}
                </small>
              </div>
              <div className="order-badges">
                <span className={`status-badge ${o.status}`}>
                  {orderStatuses[o.status]}
                </span>
                <span className={`payment-badge ${o.payment_status}`}>
                  {paymentStatuses[o.payment_status]}
                </span>
              </div>
              <strong className="order-list-total">{money(o.total)}</strong>
              <span className="text-link">Xem chi tiết</span>
            </Link>
          ))}
        </div>
      )}
      <p className="list-note">Hiển thị tối đa 200 đơn hàng gần nhất.</p>
    </section>
  );
}

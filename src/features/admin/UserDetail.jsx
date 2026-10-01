import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { api, money, roleNames } from "../../services/api";
import { formatDate, orderStatuses } from "../../services/orders";
import { Loading, ErrorMessage } from "../../components/Feedback";
export default function UserDetail({ userId, onClose }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      setData(await api(`/users/${userId}`));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [userId]);
  return (
    <aside className="admin-panel user-detail-panel">
      <div className="admin-section-heading">
        <h3>Thông tin tài khoản</h3>
        <button
          className="admin-icon-button"
          aria-label="Đóng thông tin tài khoản"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <div className="user-detail-heading">
            <span className="avatar">{data.user.name.charAt(0)}</span>
            <div>
              <h3>{data.user.name}</h3>
              <small>
                {roleNames[data.user.role]} · #{data.user.id}
              </small>
            </div>
          </div>
          <dl className="profile-details">
            <div>
              <dt>Email</dt>
              <dd>{data.user.email}</dd>
            </div>
            <div>
              <dt>Điện thoại</dt>
              <dd>{data.user.phone || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Địa chỉ</dt>
              <dd>{data.user.address || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Ngày đăng ký</dt>
              <dd>{formatDate(data.user.created_at)}</dd>
            </div>
            <div>
              <dt>Số đơn đã đặt</dt>
              <dd>{data.summary.orderCount}</dd>
            </div>
            <div>
              <dt>Tổng tiền đã thanh toán</dt>
              <dd>{money(data.summary.paidTotal)}</dd>
            </div>
          </dl>
          <h3>5 đơn hàng gần nhất</h3>
          {data.orders.length ? (
            <div className="user-recent-orders">
              {data.orders.map((o) => (
                <Link key={o.id} to={`/don-hang/${o.id}`}>
                  <span>
                    <strong>{o.id}</strong>
                    <small>{orderStatuses[o.status]}</small>
                  </span>
                  <b>{money(o.total)}</b>
                </Link>
              ))}
            </div>
          ) : (
            <p className="admin-subtext">Chưa có đơn hàng.</p>
          )}
        </>
      )}
    </aside>
  );
}

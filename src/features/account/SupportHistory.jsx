import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { formatDate } from "../../services/orders";
import { Loading, ErrorMessage } from "../../components/Feedback";
const statuses = {
  new: "Đã gửi",
  read: "Cửa hàng đã đọc",
  resolved: "Đã xử lý",
};
export default function SupportHistory() {
  const [items, setItems] = useState(null),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      setItems((await api("/inquiries")).inquiries);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <section className="account-support">
      <div className="admin-section-heading">
        <div>
          <h2>Yêu cầu hỗ trợ của bạn</h2>
          <p>Theo dõi những liên hệ đã gửi khi đăng nhập.</p>
        </div>
        <Link className="button secondary" to="/lien-he">
          Gửi yêu cầu mới
        </Link>
      </div>
      {error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : !items ? (
        <Loading />
      ) : !items.length ? (
        <div className="admin-empty">Bạn chưa gửi yêu cầu hỗ trợ.</div>
      ) : (
        items.map((i) => (
          <article className="support-card" key={i.id}>
            <div>
              <strong>Yêu cầu #{i.id}</strong>
              <span className="admin-status active">{statuses[i.status]}</span>
            </div>
            <small>{formatDate(i.created_at)}</small>
            <p>{i.message}</p>
            {i.reply ? (
              <blockquote>
                <strong>Phản hồi của cửa hàng</strong>
                <p>{i.reply}</p>
              </blockquote>
            ) : (
              <p className="admin-subtext">Chưa có phản hồi.</p>
            )}
          </article>
        ))
      )}
    </section>
  );
}

import { Bell, CheckCheck, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { useShop } from "../../context/ShopContext";
import { Loading } from "../../components/Feedback";
export default function NotificationsPage() {
  const { user, authReady, notifications, markRead } = useShop();
  if (!authReady) return <Loading />;
  const unread = notifications.filter((n) => !n.is_read).length;
  return (
    <main className="container page notifications-page">
      <div className="page-heading">
        <span className="eyebrow">CẬP NHẬT DÀNH CHO BẠN</span>
        <h1>Thông báo</h1>
        <p>
          {user
            ? `${unread} thông báo chưa đọc.`
            : "Đăng nhập để xem những cập nhật trong tài khoản."}
        </p>
      </div>
      {!user ? (
        <div className="empty-state">
          <Bell size={48} />
          <h2>Cập nhật của bạn ở đây</h2>
          <p>Thông báo được lưu riêng cho từng tài khoản.</p>
          <Link to="/dang-nhap?next=/thong-bao" className="button">
            Đăng nhập
          </Link>
        </div>
      ) : notifications.length ? (
        <section className="notification-list">
          <div className="notification-toolbar">
            <span>{notifications.length} thông báo gần nhất</span>
            <button className="text-link" disabled={!unread} onClick={markRead}>
              <CheckCheck size={17} /> Đánh dấu tất cả đã đọc
            </button>
          </div>
          {notifications.map((n) => (
            <article
              key={n.id}
              className={`notification ${n.is_read ? "read" : ""}`}
            >
              <span className="notification-icon">
                <Leaf size={21} />
              </span>
              <div>
                <h2>{n.title}</h2>
                <p>{n.message}</p>
                <time dateTime={n.created_at.replace(" ", "T") + "Z"}>
                  {new Date(
                    n.created_at.replace(" ", "T") + "Z",
                  ).toLocaleString("vi-VN")}
                </time>
              </div>
              {!n.is_read && (
                <span className="unread-dot" aria-label="Chưa đọc" />
              )}
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <Bell size={48} />
          <h2>Bạn đã xem hết cập nhật</h2>
          <p>Thông báo mới sẽ xuất hiện tại đây.</p>
        </div>
      )}
    </main>
  );
}

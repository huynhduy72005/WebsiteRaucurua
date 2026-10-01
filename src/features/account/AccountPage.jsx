import { useState, useEffect } from "react";
import { Link, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import {
  UserRound,
  ShoppingBag,
  Heart,
  Bell,
  ShieldCheck,
  LogOut,
  LockKeyhole,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { api, roleNames } from "../../services/api";
import { formatDate } from "../../services/orders";
import { Loading, ErrorMessage } from "../../components/Feedback";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import SupportHistory from "./SupportHistory";
import OrdersList from "../orders/OrdersList";
import "./account.css";
export default function AccountPage() {
  const { user, authReady, favorites, notifications, logout, showToast } =
    useShop();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [signingOut, setSigningOut] = useState(false);
  const [params, setParams] = useSearchParams(),
    navigate = useNavigate();
  const tab = params.get("tab") || "profile";
  async function load() {
    setError("");
    try {
      setData(await api("/account"));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (user) load();
  }, [user?.id]);
  async function signOut() {
    setSigningOut(true);
    try {
      await logout();
      navigate("/");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSigningOut(false);
    }
  }
  if (!authReady) return <Loading />;
  if (!user)
    return (
      <Navigate
        to={`/dang-nhap?next=${encodeURIComponent("/tai-khoan" + (params.toString() ? "?" + params.toString() : ""))}`}
        replace
      />
    );
  const tabs = [
    { id: "profile", name: "Thông tin tài khoản", icon: UserRound },
    { id: "orders", name: "Đơn hàng của tôi", icon: ShoppingBag },
    { id: "password", name: "Đổi mật khẩu", icon: LockKeyhole },
    { id: "support", name: "Hỗ trợ", icon: MessageCircle },
  ];
  return (
    <main className="container page account-page">
      <div className="page-heading">
        <span className="eyebrow">GÓC RIÊNG CỦA BẠN</span>
        <h1>Tài khoản của tôi</h1>
        <p>Thông tin, đơn hàng và những món bạn đã lưu — ở cùng một nơi.</p>
      </div>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-identity">
            <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
            <span className="role-badge">{roleNames[user.role]}</span>
          </div>
          <nav aria-label="Menu tài khoản">
            {tabs.map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => setParams({ tab: id })}
              >
                <Icon size={18} />
                {name}
              </button>
            ))}
            <Link to="/yeu-thich">
              <Heart size={18} />
              Sản phẩm yêu thích
            </Link>
            <Link to="/thong-bao">
              <Bell size={18} />
              Thông báo
            </Link>
            {user.role !== "customer" && (
              <Link to="/quan-ly" className="account-admin-link">
                <ShieldCheck size={18} />
                {user.role === "manager" ? "Trang Admin" : "Khu vực nhân viên"}
                <ArrowUpRight size={15} />
              </Link>
            )}
            <button onClick={signOut} disabled={signingOut}>
              <LogOut size={18} />
              Đăng xuất
            </button>
          </nav>
        </aside>
        <div className="account-content">
          <div className="account-summary">
            <article>
              <ShoppingBag size={20} />
              <strong>{data?.summary.orderCount ?? "—"}</strong>
              <span>Đơn đã đặt</span>
            </article>
            <article>
              <Heart size={20} />
              <strong>{favorites.length}</strong>
              <span>Sản phẩm yêu thích</span>
            </article>
            <article>
              <Bell size={20} />
              <strong>{notifications.filter((n) => !n.is_read).length}</strong>
              <span>Thông báo chưa đọc</span>
            </article>
          </div>
          {error ? (
            <ErrorMessage message={error} onRetry={load} />
          ) : !data ? (
            <Loading />
          ) : tab === "orders" ? (
            <OrdersList />
          ) : tab === "password" ? (
            <PasswordForm />
          ) : tab === "support" ? (
            <SupportHistory />
          ) : (
            <>
              <ProfileForm
                key={user.id}
                user={user}
                onSaved={(updated) => setData({ ...data, user: updated })}
              />
              <p className="account-member-since">
                Tham gia từ {formatDate(data.user.created_at)}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

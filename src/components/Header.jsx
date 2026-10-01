import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Leaf,
  Search,
  ShoppingBag,
  Bell,
  Heart,
  UserRound,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { useShop } from "../context/ShopContext";
import { roleNames } from "../services/api";
export default function Header() {
  const { user, items, favorites, notifications, categories, storeSettings } =
    useShop();
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [dropdown, setDropdown] = useState(false);
  const navigate = useNavigate(),
    location = useLocation(),
    dropdownRef = useRef(null),
    toggleRef = useRef(null);
  const unread = notifications.filter((n) => !n.is_read).length,
    count = items.reduce((s, i) => s + i.quantity, 0);
  const storeName = storeSettings?.storeName || "Vườn Nhà";
  const close = () => {
    setOpen(false);
    setDropdown(false);
  };
  useEffect(() => {
    close();
  }, [location.pathname, location.search, location.hash]);
  useEffect(() => {
    function outside(e) {
      if (!dropdownRef.current?.contains(e.target)) setDropdown(false);
    }
    function escape(e) {
      if (e.key === "Escape") {
        if (dropdown) toggleRef.current?.focus();
        setDropdown(false);
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [dropdown]);
  function search(e) {
    e.preventDefault();
    navigate(`/san-pham?q=${encodeURIComponent(query.trim())}`);
    close();
  }
  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>
            <Leaf size={12} /> Tươi ngon cho bữa ăn mỗi ngày
          </span>
          <Link to="/huong-dan">
            Mua sắm dễ dàng · Theo dõi đơn trong tài khoản{" "}
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
      <header className="header storefront-header">
        <div className="container header-main">
          <Link
            to="/"
            className="brand"
            onClick={close}
            aria-label={`${storeName} — trang chủ`}
          >
            <span className="brand-icon">
              <Leaf size={29} />
            </span>
            <span>
              {storeName}
              <small>RAU CỦ & TRÁI CÂY</small>
            </span>
          </Link>
          <form className="search" onSubmit={search} role="search">
            <Search size={20} />
            <input
              aria-label="Tìm sản phẩm"
              placeholder="Tìm chút tươi xanh cho hôm nay…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">Tìm kiếm</button>
          </form>
          <div className="header-actions">
            <NavLink
              to="/thong-bao"
              className="icon-link"
              aria-label={`Thông báo, ${unread} chưa đọc`}
              onClick={close}
            >
              <Bell size={22} />
              {unread > 0 && (
                <b className="counter">{unread > 9 ? "9+" : unread}</b>
              )}
            </NavLink>
            <NavLink
              to="/yeu-thich"
              className="icon-link favorite-header-link"
              aria-label={`Yêu thích, ${favorites.length} sản phẩm`}
              onClick={close}
            >
              <Heart size={22} />
              {favorites.length > 0 && (
                <b className="counter">
                  {favorites.length > 9 ? "9+" : favorites.length}
                </b>
              )}
            </NavLink>
            <NavLink
              to="/gio-hang"
              className="icon-link"
              aria-label={`Giỏ hàng, ${count} sản phẩm`}
              onClick={close}
            >
              <ShoppingBag size={22} />
              {count > 0 && (
                <b className="counter">{count > 99 ? "99+" : count}</b>
              )}
            </NavLink>
            <Link
              to="/tai-khoan"
              className={user ? "account-button" : "login-link"}
              aria-label="Tài khoản của tôi"
              onClick={close}
            >
              {user ? (
                <>
                  <span className="avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="account-label">
                    {user.name.split(" ").slice(-2).join(" ")}
                    <small>{roleNames[user.role]}</small>
                  </span>
                </>
              ) : (
                <>
                  <UserRound size={22} />
                  <span>Tài khoản</span>
                </>
              )}
            </Link>
            <button
              className="mobile-menu icon-link"
              aria-label={open ? "Đóng menu" : "Mở menu"}
              aria-expanded={open}
              aria-controls="main-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <div className="nav-line">
          <div className="container nav-inner">
            <nav
              id="main-navigation"
              className={open ? "navigation open" : "navigation"}
              aria-label="Menu chính"
            >
              <NavLink to="/" end onClick={close}>
                Trang chủ
              </NavLink>
              <div className="product-nav" ref={dropdownRef}>
                <div className="product-nav-line">
                  <NavLink to="/san-pham" onClick={close}>
                    Sản phẩm
                  </NavLink>
                  <button
                    ref={toggleRef}
                    aria-label="Mở danh mục sản phẩm"
                    aria-expanded={dropdown}
                    aria-controls="product-dropdown"
                    onClick={() => setDropdown(!dropdown)}
                    className={
                      dropdown ? "dropdown-toggle expanded" : "dropdown-toggle"
                    }
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {dropdown && (
                  <div className="product-dropdown" id="product-dropdown">
                    <span className="dropdown-heading">Khám phá khu vườn</span>
                    <Link to="/san-pham" onClick={close}>
                      <span>Tất cả sản phẩm</span>
                      <ArrowUpRight size={16} />
                    </Link>
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        to={`/san-pham?category=${encodeURIComponent(c.id)}`}
                        onClick={close}
                      >
                        <span>{c.name}</span>
                        <small>{c.productCount}</small>
                      </Link>
                    ))}
                    {!categories.length && (
                      <small className="dropdown-empty">
                        Chưa có danh mục sản phẩm.
                      </small>
                    )}
                  </div>
                )}
              </div>
              <NavLink to="/thong-tin" onClick={close}>
                Thông tin
              </NavLink>
              <NavLink to="/huong-dan" onClick={close}>
                Hướng dẫn mua hàng
              </NavLink>
              <NavLink to="/lien-he" onClick={close}>
                Liên hệ
              </NavLink>
            </nav>
            <span className="nav-note">
              <Leaf size={15} /> Một chút xanh cho ngày mới
            </span>
          </div>
        </div>
      </header>
    </>
  );
}

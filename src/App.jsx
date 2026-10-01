import { useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Feedback from "./components/Feedback";
import HomePage from "./features/products/HomePage";
import ProductsPage from "./features/products/ProductsPage";
import ProductDetail from "./features/products/ProductDetail";
import AuthPage from "./features/auth/AuthPage";
import CartPage from "./features/cart/CartPage";
import NotificationsPage from "./features/notifications/NotificationsPage";
import AdminPage from "./features/admin/AdminPage";
import CheckoutPage from "./features/checkout/CheckoutPage";
import OrdersPage from "./features/orders/OrdersPage";
import OrderDetail from "./features/orders/OrderDetail";
import FavoritesPage from "./features/favorites/FavoritesPage";
import AccountPage from "./features/account/AccountPage";
import InformationPage from "./features/content/InformationPage";
import ContactPage from "./features/content/ContactPage";
import GuidePage from "./features/content/GuidePage";
import "./App.css";
import "./features/orders/orders.css";
import "./features/content/storefront.css";
export default function App() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const frame = requestAnimationFrame(() =>
        document
          .getElementById(hash.slice(1))
          ?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "auto"
              : "smooth",
          }),
      );
      return () => cancelAnimationFrame(frame);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <>
      <a className="skip-link" href="#content">
        Đến nội dung chính
      </a>
      <Header />
      <div id="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/san-pham" element={<ProductsPage />} />
          <Route path="/san-pham/:id" element={<ProductDetail />} />
          <Route path="/dang-nhap" element={<AuthPage />} />
          <Route path="/dang-ky" element={<AuthPage register />} />
          <Route path="/gio-hang" element={<CartPage />} />
          <Route path="/thong-bao" element={<NotificationsPage />} />
          <Route path="/quan-ly" element={<AdminPage />} />
          <Route path="/tai-khoan" element={<AccountPage />} />
          <Route path="/thong-tin" element={<InformationPage />} />
          <Route path="/lien-he" element={<ContactPage />} />
          <Route path="/huong-dan" element={<GuidePage />} />
          <Route path="/thanh-toan" element={<CheckoutPage />} />
          <Route path="/don-hang" element={<OrdersPage />} />
          <Route path="/don-hang/:id" element={<OrderDetail />} />
          <Route path="/yeu-thich" element={<FavoritesPage />} />
          <Route
            path="*"
            element={
              <main className="container page empty-state">
                <h1>Trang này không tồn tại</h1>
                <Link className="button" to="/">
                  Về trang chủ
                </Link>
              </main>
            }
          />
        </Routes>
      </div>
      <Footer />
      <Feedback />
    </>
  );
}

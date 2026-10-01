import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Package,
  Users,
  ShieldCheck,
  Settings,
  ShoppingBag,
  LayoutDashboard,
  Layers3,
  Mail,
} from "lucide-react";
import OrdersList from "../orders/OrdersList";
import StoreSettings from "./StoreSettings";
import ProductManager from "./ProductManager";
import RevenueDashboard from "./RevenueDashboard";
import AccountsManager from "./AccountsManager";
import CategoryManager from "./CategoryManager";
import InquiryManager from "./InquiryManager";
import { useShop } from "../../context/ShopContext";
import { roleNames } from "../../services/api";
import { Loading, ErrorMessage } from "../../components/Feedback";
import "./admin.css";
export default function AdminPage() {
  const { user, authReady } = useShop();
  const [tab, setTab] = useState("overview");
  if (!authReady) return <Loading />;
  if (!user) return <Navigate to="/dang-nhap?next=/quan-ly" replace />;
  if (user.role === "customer")
    return (
      <main className="container page">
        <ErrorMessage message="Trang này dành cho nhân viên và quản lý cửa hàng." />
      </main>
    );
  const manager = user.role === "manager";
  const selected =
    manager || ["products", "orders", "inquiries"].includes(tab)
      ? tab
      : "products";
  const tabs = [
    ...(manager
      ? [
          {
            id: "overview",
            name: "Tổng quan & doanh thu",
            icon: LayoutDashboard,
          },
        ]
      : []),
    { id: "products", name: "Sản phẩm", icon: Package },
    ...(manager
      ? [{ id: "categories", name: "Danh mục sản phẩm", icon: Layers3 }]
      : []),
    { id: "orders", name: "Đơn hàng", icon: ShoppingBag },
    { id: "inquiries", name: "Liên hệ & hỗ trợ", icon: Mail },
    ...(manager
      ? [
          { id: "accounts", name: "Tài khoản & phân quyền", icon: Users },
          { id: "settings", name: "Cửa hàng & thanh toán", icon: Settings },
        ]
      : []),
  ];
  return (
    <main className="container page admin-page">
      <div className="admin-heading">
        <div className="page-heading">
          <span className="eyebrow">ADMIN · VƯỜN NHÀ</span>
          <h1>Xin chào, {user.name}</h1>
          <p>Quản lý cửa hàng và theo dõi hoạt động bán hàng.</p>
        </div>
        <span className="role-badge">
          <ShieldCheck size={16} />
          {roleNames[user.role]}
        </span>
      </div>
      <nav className="admin-tabs" aria-label="Chức năng Admin">
        {tabs.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={selected === id ? "active" : ""}
            aria-current={selected === id ? "page" : undefined}
          >
            <Icon size={18} />
            {name}
          </button>
        ))}
      </nav>
      {selected === "overview" && manager ? (
        <RevenueDashboard />
      ) : selected === "orders" ? (
        <OrdersList all />
      ) : selected === "categories" && manager ? (
        <CategoryManager />
      ) : selected === "inquiries" ? (
        <InquiryManager />
      ) : selected === "settings" && manager ? (
        <StoreSettings />
      ) : selected === "accounts" && manager ? (
        <AccountsManager />
      ) : (
        <ProductManager />
      )}
    </main>
  );
}

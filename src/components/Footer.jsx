import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useShop } from "../context/ShopContext";
export default function Footer() {
  const { storeSettings } = useShop();
  const storeName = storeSettings?.storeName || "Vườn Nhà";
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <Link to="/" className="footer-brand">
            <Leaf size={22} /> {storeName}
          </Link>
          <p>Thêm sắc xanh cho bữa ăn của bạn.</p>
        </div>
        <nav aria-label="Menu cuối trang">
          <Link to="/san-pham">Khám phá sản phẩm</Link>
          <Link to="/thong-tin">Thông tin</Link>
          <Link to="/huong-dan">Hướng dẫn mua hàng</Link>
          <Link to="/lien-he">Liên hệ</Link>
          <Link to="/tai-khoan">Tài khoản</Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {storeName}
        </span>
        <span>Sản phẩm, giá và xuất xứ minh họa</span>
      </div>
    </footer>
  );
}

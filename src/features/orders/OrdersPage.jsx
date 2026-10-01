import { Navigate } from "react-router-dom";
import { useShop } from "../../context/ShopContext";
import { Loading } from "../../components/Feedback";
import OrdersList from "./OrdersList";
export default function OrdersPage() {
  const { user, authReady } = useShop();
  if (!authReady) return <Loading />;
  if (!user) return <Navigate to="/dang-nhap?next=/don-hang" replace />;
  return (
    <main className="container page">
      <div className="page-heading">
        <span className="eyebrow">CÁC MÓN BẠN ĐÃ ĐẶT</span>
        <h1>Đơn hàng của bạn</h1>
        <p>Theo dõi giao hàng, thanh toán và tải hóa đơn.</p>
      </div>
      <OrdersList />
    </main>
  );
}

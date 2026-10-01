import { useState, useEffect } from "react";
import {
  Link,
  useParams,
  Navigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  Download,
  Package,
  RefreshCw,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { api, money } from "../../services/api";
import {
  orderStatuses,
  paymentStatuses,
  paymentMethods,
  formatDate,
  downloadInvoice,
} from "../../services/orders";
import { Loading, ErrorMessage } from "../../components/Feedback";
export default function OrderDetail() {
  const { id } = useParams(),
    location = useLocation();
  const [params] = useSearchParams();
  const { user, authReady, showToast, loadProducts, refreshNotifications } =
    useShop();
  const [order, setOrder] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmCancel, setConfirmCancel] = useState(false),
    [reference, setReference] = useState("");
  async function load() {
    setError("");
    try {
      setOrder((await api(`/orders/${id}`)).order);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (authReady && user) {
      setLoading(true);
      load();
    }
  }, [id, user?.id, authReady]);
  // Sau khi trở về từ VNPay, kiểm tra lại IPN trong tối đa một phút.
  useEffect(() => {
    if (
      params.get("paymentReturn") !== "received" ||
      !order ||
      order.payment_status === "paid"
    )
      return;
    let attempts = 0;
    const timer = setInterval(() => {
      if (++attempts > 12) {
        clearInterval(timer);
        return;
      }
      api(`/orders/${id}`)
        .then((d) => setOrder(d.order))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [id, order?.payment_status, Boolean(order), params.get("paymentReturn")]);
  if (!authReady) return <Loading />;
  if (!user)
    return (
      <Navigate
        to={`/dang-nhap?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (loading) return <Loading />;
  if (error)
    return (
      <main className="container page">
        <ErrorMessage message={error} onRetry={load} />
      </main>
    );
  if (!order) return null;
  const staff = ["staff", "manager"].includes(user.role);
  async function action(path, body, method = "POST") {
    setBusy(true);
    try {
      const result = await api(`/orders/${id}/${path}`, { method, body });
      setOrder(result.order);
      setConfirmCancel(false);
      await Promise.allSettled([loadProducts(), refreshNotifications()]);
      showToast("Đã cập nhật đơn hàng.");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function invoice() {
    setBusy(true);
    try {
      await downloadInvoice(id);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    setBusy(true);
    try {
      const data = await api(`/payments/vnpay/${id}`, { method: "POST" });
      window.location.assign(data.url);
    } catch (e) {
      showToast(e.message, "error");
      setBusy(false);
    }
  }
  const nextStatus = {
      pending: "confirmed",
      confirmed: "shipping",
      shipping: "delivered",
    }[order.status],
    canCancel = order.status === "pending" && order.payment_status !== "paid";
  return (
    <main className="container page">
      <div className="order-detail-heading">
        <div className="page-heading">
          <span className="eyebrow">CHI TIẾT ĐƠN HÀNG</span>
          <h1>{order.id}</h1>
          <p>Đặt lúc {formatDate(order.created_at)}</p>
        </div>
        <div className="order-detail-actions">
          <button className="button secondary" disabled={busy} onClick={load}>
            <RefreshCw size={17} /> Cập nhật
          </button>
          <button className="button" disabled={busy} onClick={invoice}>
            <Download size={18} /> Xuất hóa đơn PDF
          </button>
        </div>
      </div>
      {location.state?.created && (
        <div className="success-panel">
          <CheckCircle2 size={22} /> Đặt hàng thành công. Đơn của bạn đang chờ
          cửa hàng xác nhận.
        </div>
      )}
      {location.state?.paymentError && (
        <div className="form-error">
          Đơn đã tạo nhưng chưa mở được VNPay: {location.state.paymentError}.
          Bạn có thể thử thanh toán từ trang này.
        </div>
      )}
      {params.get("paymentReturn") === "received" &&
        order.payment_status !== "paid" && (
          <div className="info-panel">
            Đã trở về từ VNPay. Đang chờ máy chủ xác minh thanh toán; chưa ghi
            nhận đã trả tiền. Bạn có thể cập nhật lại trạng thái.
          </div>
        )}
      {params.get("paymentReturn") === "failed" &&
        order.payment_status !== "paid" && (
          <div className="form-error">
            Giao dịch chưa thành công hoặc đã bị hủy trên cổng thanh toán. Trạng
            thái đơn được cập nhật khi VNPay xác nhận.
          </div>
        )}
      <div className="order-overview">
        <div>
          <span>Giao hàng</span>
          <strong className={`status-badge ${order.status}`}>
            {orderStatuses[order.status]}
          </strong>
        </div>
        <div>
          <span>Thanh toán</span>
          <strong className={`payment-badge ${order.payment_status}`}>
            {paymentStatuses[order.payment_status]}
          </strong>
        </div>
        <div>
          <span>Phương thức</span>
          <strong>{paymentMethods[order.payment_method]}</strong>
        </div>
        <div>
          <span>Tổng tiền</span>
          <strong>{money(order.total)}</strong>
        </div>
      </div>
      <div className="order-detail-grid">
        <section className="order-content">
          <div className="form-panel">
            <h2>
              <Package size={21} /> Sản phẩm đã đặt
            </h2>
            {order.items.map((p) => (
              <div className="order-product" key={p.id}>
                <Link to={`/san-pham/${p.product_id}`}>
                  <img src={p.image} alt={p.name} />
                </Link>
                <div>
                  <Link to={`/san-pham/${p.product_id}`}>
                    <strong>{p.name}</strong>
                  </Link>
                  <small>
                    {p.quantity} × {p.unit} · {money(p.price)} / đơn vị
                  </small>
                </div>
                <strong>{money(p.price * p.quantity)}</strong>
              </div>
            ))}
            <div className="summary-line">
              <span>Tạm tính</span>
              <strong>{money(order.subtotal)}</strong>
            </div>
            <div className="summary-line">
              <span>Phí giao hàng</span>
              <strong>
                {order.shipping_fee ? money(order.shipping_fee) : "Miễn phí"}
              </strong>
            </div>
            <div className="summary-line grand-total">
              <span>Tổng cộng</span>
              <strong>{money(order.total)}</strong>
            </div>
          </div>
          <div className="form-panel">
            <h2>Lịch sử đơn hàng</h2>
            <ol className="order-history">
              {order.history.map((h, index) => (
                <li key={index}>
                  <strong>{h.message}</strong>
                  <small>{formatDate(h.created_at)}</small>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <aside className="order-sidebar">
          <section className="form-panel">
            <h2>Người nhận</h2>
            <strong>{order.recipient}</strong>
            <p>{order.phone}</p>
            <p>{order.address}</p>
            {order.note && (
              <p className="order-note">
                <strong>Ghi chú: </strong>
                {order.note}
              </p>
            )}
          </section>
          {order.payment_method === "bank" &&
            order.payment_status !== "paid" &&
            order.status !== "cancelled" && (
              <section className="form-panel bank-instructions">
                <h2>Thông tin chuyển khoản</h2>
                <dl>
                  <dt>Ngân hàng</dt>
                  <dd>{order.bank_snapshot.name}</dd>
                  <dt>Số tài khoản</dt>
                  <dd>{order.bank_snapshot.account}</dd>
                  <dt>Chủ tài khoản</dt>
                  <dd>{order.bank_snapshot.holder}</dd>
                  <dt>Số tiền</dt>
                  <dd>{money(order.total)}</dd>
                  <dt>Nội dung chuyển khoản</dt>
                  <dd>{order.id}</dd>
                </dl>
                <p>
                  Cửa hàng sẽ xác nhận sau khi nhận đủ tiền. Hãy dùng đúng mã
                  đơn làm nội dung chuyển khoản.
                </p>
              </section>
            )}
          {order.payment_method === "vnpay" &&
            order.payment_status !== "paid" &&
            order.status !== "cancelled" &&
            order.user_id === user.id && (
              <section className="form-panel">
                <h2>Thanh toán VNPay</h2>
                <p>
                  Đơn hàng vẫn được lưu nếu bạn chưa thanh toán. Không tạo đơn
                  mới để thử lại.
                </p>
                <button
                  className="button full-width"
                  disabled={busy}
                  onClick={pay}
                >
                  <CreditCard size={19} /> Thanh toán qua VNPay
                </button>
              </section>
            )}
          {staff &&
            order.status !== "cancelled" &&
            order.status !== "delivered" && (
              <section className="form-panel staff-order-panel">
                <h2>Xử lý đơn hàng</h2>
                {order.payment_status !== "paid" &&
                  order.payment_method !== "vnpay" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        action("confirm-payment", { reference });
                      }}
                    >
                      <label>
                        Mã giao dịch / ghi nhận thu COD
                        <input
                          required
                          minLength={3}
                          maxLength={120}
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                        />
                      </label>
                      <p>
                        Chỉ xác nhận sau khi cửa hàng đã nhận đủ{" "}
                        {money(order.total)}.
                      </p>
                      <button
                        className="button secondary full-width"
                        disabled={busy}
                      >
                        Xác nhận đã nhận tiền
                      </button>
                    </form>
                  )}
                {nextStatus && (
                  <button
                    className="button full-width"
                    disabled={
                      busy ||
                      (order.payment_status !== "paid" &&
                        (order.payment_method !== "cod" ||
                          nextStatus === "delivered"))
                    }
                    onClick={() =>
                      action("status", { status: nextStatus }, "PATCH")
                    }
                  >
                    Chuyển sang: {orderStatuses[nextStatus]}
                  </button>
                )}
              </section>
            )}
          {canCancel && (
            <section className="cancel-panel">
              {confirmCancel ? (
                <>
                  <p>
                    Bạn muốn hủy đơn này? Sản phẩm sẽ được hoàn lại vào kho.
                  </p>
                  <div>
                    <button
                      className="danger-button"
                      disabled={busy}
                      onClick={() => action("cancel")}
                    >
                      Xác nhận hủy đơn
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => setConfirmCancel(false)}
                    >
                      Giữ đơn
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => setConfirmCancel(true)}
                >
                  Hủy đơn chưa xác nhận
                </button>
              )}
            </section>
          )}
        </aside>
      </div>
      <div className="order-backlinks">
        <Link className="text-link" to="/don-hang">
          Đơn hàng của tôi
        </Link>
        {staff && (
          <Link className="text-link" to="/quan-ly">
            Khu vực quản lý
          </Link>
        )}
      </div>
      <p className="invoice-note">
        PDF là chứng từ đơn hàng của cửa hàng, chưa phải hóa đơn VAT.
      </p>
    </main>
  );
}

import { useState, useEffect, useRef } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Truck,
  Wallet,
  CreditCard,
  Building2,
  LoaderCircle,
} from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { api, money } from "../../services/api";
import { Loading, ErrorMessage } from "../../components/Feedback";
export default function CheckoutPage() {
  const {
    user,
    authReady,
    items,
    refreshCart,
    loadProducts,
    refreshNotifications,
  } = useShop();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null),
    [settingsError, setSettingsError] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    recipient: "",
    phone: "",
    address: "",
    note: "",
    paymentMethod: "cod",
  });
  const key = useRef(crypto.randomUUID()),
    createdOrder = useRef(null);
  useEffect(() => {
    if (user)
      setForm((current) => ({
        ...current,
        recipient: current.recipient || user.name,
        phone: current.phone || user.phone || "",
        address: current.address || user.address || "",
      }));
  }, [user?.id]);
  async function loadSettings() {
    setSettingsError("");
    try {
      setSettings((await api("/settings")).settings);
    } catch (e) {
      setSettingsError(e.message);
    }
  }
  useEffect(() => {
    loadSettings();
  }, []);
  if (!authReady) return <Loading />;
  if (!user) return <Navigate to="/dang-nhap?next=/thanh-toan" replace />;
  if (settingsError)
    return (
      <main className="container page">
        <ErrorMessage message={settingsError} onRetry={loadSettings} />
      </main>
    );
  if (!settings) return <Loading />;
  if (!items.length && !busy && !createdOrder.current)
    return (
      <main className="container page empty-state">
        <h1>Giỏ hàng đang trống</h1>
        <Link className="button" to="/san-pham">
          Chọn sản phẩm
        </Link>
      </main>
    );
  const subtotal = items.reduce((sum, p) => sum + p.price * p.quantity, 0),
    shipping = subtotal >= settings.freeShippingFrom ? 0 : settings.shippingFee,
    total = subtotal + shipping;
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    let order;
    try {
      order = (
        await api("/orders", {
          method: "POST",
          body: {
            ...form,
            checkoutKey: key.current,
            expectedTotal: total,
            items: items.map((p) => ({
              id: p.id,
              price: p.price,
              quantity: p.quantity,
            })),
          },
        })
      ).order;
      createdOrder.current = order;
    } catch (e) {
      setError(e.message);
      await Promise.allSettled([refreshCart(), loadProducts(), loadSettings()]);
      setBusy(false);
      return;
    }
    // Đơn đã tạo: không tạo lại đơn chỉ vì tải giỏ hàng hoặc chuyển VNPay gặp lỗi.
    await Promise.allSettled([
      refreshCart(),
      loadProducts(),
      refreshNotifications(),
    ]);
    if (order.payment_method === "vnpay") {
      try {
        const payment = await api(`/payments/vnpay/${order.id}`, {
          method: "POST",
        });
        window.location.assign(payment.url);
        return;
      } catch (e) {
        navigate(`/don-hang/${order.id}`, {
          state: { paymentError: e.message },
        });
        return;
      }
    }
    navigate(`/don-hang/${order.id}`, { state: { created: true } });
  }
  const methods = [
    {
      id: "cod",
      title: "Thanh toán khi nhận hàng",
      description: "Thanh toán cho nhân viên giao hàng khi nhận đơn.",
      icon: Wallet,
      enabled: true,
    },
    {
      id: "bank",
      title: "Chuyển khoản ngân hàng",
      description: settings.bankReady
        ? `Chuyển khoản vào ${settings.bankName}. Cửa hàng xác nhận sau khi nhận tiền.`
        : "Cửa hàng chưa thiết lập tài khoản ngân hàng.",
      icon: Building2,
      enabled: settings.bankReady,
    },
    {
      id: "vnpay",
      title: "Thanh toán online qua VNPay",
      description: settings.vnpayReady
        ? settings.vnpaySandbox
          ? "Đang dùng môi trường thử nghiệm VNPay, chưa thu tiền thật."
          : "Chuyển đến cổng VNPay để thanh toán an toàn."
        : "Cửa hàng chưa kích hoạt VNPay.",
      icon: CreditCard,
      enabled: settings.vnpayReady,
    },
  ];
  return (
    <main className="container page">
      <div className="page-heading">
        <span className="eyebrow">HOÀN TẤT BỮA ĂN TƯƠI NGON</span>
        <h1>Đặt hàng & thanh toán</h1>
        <p>Kiểm tra thông tin giao hàng và chọn cách thanh toán.</p>
      </div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-main">
          <section className="form-panel">
            <h2>
              <Truck size={22} /> Thông tin nhận hàng
            </h2>
            <div className="form-two-columns">
              <label>
                Họ và tên
                <input
                  name="recipient"
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={form.recipient}
                  onChange={update}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  minLength={8}
                  maxLength={20}
                  value={form.phone}
                  onChange={update}
                />
              </label>
            </div>
            <label>
              Địa chỉ nhận hàng
              <textarea
                name="address"
                aria-label="Địa chỉ nhận hàng"
                autoComplete="street-address"
                required
                minLength={10}
                maxLength={300}
                rows={3}
                placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                value={form.address}
                onChange={update}
              />
            </label>
            <label>
              Ghi chú (không bắt buộc)
              <textarea
                name="note"
                aria-label="Ghi chú đơn hàng"
                maxLength={500}
                rows={2}
                placeholder="Ví dụ: gọi trước khi giao hàng"
                value={form.note}
                onChange={update}
              />
            </label>
          </section>
          <fieldset className="form-panel payment-options">
            <legend>Phương thức thanh toán</legend>
            {methods.map((method) => (
              <label
                className={`payment-option ${form.paymentMethod === method.id ? "selected" : ""} ${method.enabled ? "" : "unavailable"}`}
                key={method.id}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={form.paymentMethod === method.id}
                  disabled={!method.enabled || busy}
                  onChange={update}
                />
                <method.icon size={23} />
                <span>
                  <strong>{method.title}</strong>
                  <small>{method.description}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
        <aside className="checkout-summary">
          <h2>Đơn hàng của bạn</h2>
          {items.map((p) => (
            <div className="checkout-product" key={p.id}>
              <img src={p.image} alt="" />
              <span>
                {p.name}
                <small>
                  {p.quantity} × {p.unit}
                </small>
              </span>
              <strong>{money(p.price * p.quantity)}</strong>
            </div>
          ))}
          <div className="summary-line">
            <span>Tạm tính</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="summary-line">
            <span>Phí giao hàng</span>
            <strong>{shipping ? money(shipping) : "Miễn phí"}</strong>
          </div>
          <p className="shipping-note">
            Miễn phí giao hàng từ {money(settings.freeShippingFrom)}.
          </p>
          <div className="summary-line grand-total">
            <span>Tổng thanh toán</span>
            <strong>{money(total)}</strong>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button
            className="button full-width"
            disabled={busy || items.some((p) => p.quantity > p.stock)}
          >
            {busy ? (
              <>
                <LoaderCircle size={19} className="spin" /> Đang tạo đơn…
              </>
            ) : (
              "Xác nhận đặt hàng"
            )}
          </button>
          {items.some((p) => p.quantity > p.stock) && (
            <p className="form-error">
              Một số món không còn đủ số lượng. Hãy cập nhật giỏ hàng.
            </p>
          )}
          <Link className="text-link" to="/gio-hang">
            Quay lại giỏ hàng
          </Link>
        </aside>
      </form>
    </main>
  );
}

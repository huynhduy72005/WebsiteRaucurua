import { useState, useEffect } from "react";
import { Save, Building2, Truck } from "lucide-react";
import { api } from "../../services/api";
import { useShop } from "../../context/ShopContext";
import { Loading, ErrorMessage } from "../../components/Feedback";
export default function StoreSettings() {
  const { showToast, loadProducts } = useShop();
  const [form, setForm] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    try {
      setForm((await api("/settings")).settings);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!form) return <Loading />;
  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api("/settings", {
        method: "PUT",
        body: {
          ...form,
          shippingFee: Number(form.shippingFee),
          freeShippingFrom: Number(form.freeShippingFrom),
        },
      });
      setForm(data.settings);
      await loadProducts();
      showToast("Đã lưu thông tin cửa hàng.");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="store-settings" onSubmit={save}>
      <section className="form-panel">
        <h2>Thông tin cửa hàng trên hóa đơn</h2>
        <label>
          Tên cửa hàng
          <input
            name="storeName"
            required
            maxLength={80}
            value={form.storeName}
            onChange={update}
          />
        </label>
        <label>
          Địa chỉ cửa hàng
          <input
            name="storeAddress"
            maxLength={300}
            value={form.storeAddress}
            onChange={update}
          />
        </label>
        <label>
          Điện thoại
          <input
            name="storePhone"
            type="tel"
            maxLength={30}
            value={form.storePhone}
            onChange={update}
          />
        </label>
      </section>
      <section className="form-panel">
        <h2>
          <Building2 size={21} /> Chuyển khoản ngân hàng
        </h2>
        <p>
          Nhập đủ ba thông tin dưới đây để khách có thể chọn chuyển khoản. Đơn
          đã đặt giữ nguyên thông tin ngân hàng tại thời điểm đặt.
        </p>
        <label>
          Ngân hàng
          <input
            name="bankName"
            maxLength={100}
            placeholder="Tên ngân hàng của cửa hàng"
            value={form.bankName}
            onChange={update}
          />
        </label>
        <label>
          Số tài khoản
          <input
            name="bankAccount"
            inputMode="numeric"
            maxLength={40}
            value={form.bankAccount}
            onChange={update}
          />
        </label>
        <label>
          Tên chủ tài khoản
          <input
            name="bankHolder"
            maxLength={100}
            value={form.bankHolder}
            onChange={update}
          />
        </label>
      </section>
      <section className="form-panel">
        <h2>
          <Truck size={21} /> Phí giao hàng
        </h2>
        <div className="form-two-columns">
          <label>
            Phí giao hàng (đ)
            <input
              name="shippingFee"
              type="number"
              required
              min="0"
              max="100000000"
              step="1"
              value={form.shippingFee}
              onChange={update}
            />
          </label>
          <label>
            Miễn phí từ giá trị đơn (đ)
            <input
              name="freeShippingFrom"
              type="number"
              required
              min="0"
              max="100000000"
              step="1"
              value={form.freeShippingFrom}
              onChange={update}
            />
          </label>
        </div>
        <p>Đặt ngưỡng miễn phí là 0 nếu mọi đơn đều được miễn phí giao hàng.</p>
      </section>
      <section className="form-panel">
        <h2>Kết nối VNPay</h2>
        <p>
          {form.vnpayReady
            ? form.vnpaySandbox
              ? "Đã cấu hình VNPay thử nghiệm. Chưa thu tiền thật."
              : "Đã cấu hình VNPay."
            : "Chưa cấu hình VNPay. Nhập thông tin kết nối vào .env theo file PAYMENT_SETUP.md trong dự án."}
        </p>
        <p>
          Mã bí mật VNPay chỉ đặt trên máy chủ, không hiển thị trong trang quản
          lý.
        </p>
      </section>
      <button className="button" disabled={busy}>
        <Save size={18} />
        {busy ? "Đang lưu…" : "Lưu cài đặt cửa hàng"}
      </button>
    </form>
  );
}

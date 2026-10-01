import { useState } from "react";
import { Save } from "lucide-react";
import { useShop } from "../../context/ShopContext";
export default function ProfileForm({ user, onSaved }) {
  const { updateProfile, showToast } = useShop();
  const [form, setForm] = useState({
      name: user.name,
      phone: user.phone,
      address: user.address,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const updated = await updateProfile(form);
      onSaved(updated);
      showToast("Đã lưu thông tin tài khoản.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-panel profile-form" onSubmit={save}>
      <span className="eyebrow">HỒ SƠ CÁ NHÂN</span>
      <h2>Thông tin của bạn</h2>
      <p>Điện thoại và địa chỉ được gợi ý khi bạn thanh toán đơn hàng.</p>
      <fieldset className="admin-form-fields" disabled={busy}>
        <div className="form-two-columns">
          <label>
            Họ và tên
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              value={form.name}
              onChange={change}
            />
          </label>
          <label>
            Email đăng nhập
            <input
              value={user.email}
              readOnly
              aria-describedby="profile-email-note"
            />
            <small id="profile-email-note">
              Email đăng nhập được giữ nguyên.
            </small>
          </label>
        </div>
        <label>
          Số điện thoại
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            value={form.phone}
            onChange={change}
            placeholder="Có thể bổ sung sau"
          />
        </label>
        <label>
          Địa chỉ nhận hàng mặc định
          <textarea
            name="address"
            aria-label="Địa chỉ nhận hàng mặc định"
            autoComplete="street-address"
            rows={3}
            maxLength={300}
            value={form.address}
            onChange={change}
            placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
          />
        </label>
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        <Save size={17} />
        {busy ? "Đang lưu…" : "Lưu thông tin"}
      </button>
    </form>
  );
}

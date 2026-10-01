import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { api } from "../../services/api";
import { useShop } from "../../context/ShopContext";
export default function PasswordForm() {
  const { showToast, refreshNotifications } = useShop();
  const [form, setForm] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("Hai mật khẩu mới chưa giống nhau.");
      return;
    }
    setBusy(true);
    try {
      await api("/account/password", { method: "POST", body: form });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast(
        "Đã đổi mật khẩu. Bạn tiếp tục đăng nhập trên trình duyệt này.",
      );
      // Mật khẩu đã đổi thành công; lỗi tải thông báo không làm mất kết quả đó.
      await refreshNotifications().catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-panel password-form" onSubmit={save}>
      <span className="eyebrow">BẢO MẬT TÀI KHOẢN</span>
      <h2>Đổi mật khẩu</h2>
      <p>Các phiên đăng nhập cũ sẽ kết thúc sau khi đổi mật khẩu.</p>
      <fieldset className="admin-form-fields" disabled={busy}>
        {[
          {
            key: "currentPassword",
            label: "Mật khẩu hiện tại",
            autoComplete: "current-password",
          },
          {
            key: "newPassword",
            label: "Mật khẩu mới",
            autoComplete: "new-password",
          },
          {
            key: "confirmPassword",
            label: "Nhập lại mật khẩu mới",
            autoComplete: "new-password",
          },
        ].map((f) => (
          <label key={f.key}>
            {f.label}
            <input
              type="password"
              autoComplete={f.autoComplete}
              minLength={f.key === "currentPassword" ? 1 : 8}
              maxLength={128}
              required
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        <LockKeyhole size={17} />
        {busy ? "Đang cập nhật…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}

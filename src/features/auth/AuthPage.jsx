import { useState } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { Leaf, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { Loading } from "../../components/Feedback";
export default function AuthPage({ register = false }) {
  const { user, authReady, authenticate } = useShop();
  const [form, setForm] = useState({ name: "", email: "", password: "" }),
    [visible, setVisible] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("next");
  const safeNext =
    redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  if (!authReady) return <Loading />;
  if (user) return <Navigate to={safeNext} replace />;
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await authenticate(register ? "register" : "login", form);
      navigate(safeNext, { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const suffix = redirect ? `?next=${encodeURIComponent(safeNext)}` : "";
  return (
    <main className="container auth-page">
      <div className="auth-art">
        <Leaf size={40} />
        <span className="eyebrow">CHÀO BẠN ĐẾN VƯỜN NHÀ</span>
        <h2>
          Một chút tươi xanh.
          <br />
          Một ngày thật lành.
        </h2>
        <p>Lưu giỏ hàng và nhận cập nhật dành riêng cho bạn.</p>
        <img src="/images/broccoli.jpg" alt="Bông cải xanh" />
      </div>
      <section className="auth-card">
        <span className="eyebrow">TÀI KHOẢN VƯỜN NHÀ</span>
        <h1>{register ? "Tạo tài khoản" : "Chào mừng trở lại"}</h1>
        <p>
          {register
            ? "Cùng bắt đầu một bữa ăn tươi ngon."
            : "Đăng nhập để tiếp tục chọn món bạn thích."}
        </p>
        <form onSubmit={submit}>
          {register && (
            <label>
              Họ và tên
              <input
                name="name"
                autoComplete="name"
                placeholder="Nguyễn Văn An"
                required
                maxLength={80}
                value={form.name}
                onChange={update}
              />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ban@example.com"
              required
              maxLength={254}
              value={form.email}
              onChange={update}
            />
          </label>
          <label>
            Mật khẩu
            <div className="password-field">
              <input
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={register ? "Ít nhất 8 ký tự" : "Nhập mật khẩu"}
                required
                minLength={register ? 8 : 1}
                maxLength={128}
                value={form.password}
                onChange={update}
              />
              <button
                type="button"
                aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </label>
          {register && (
            <p className="form-note">
              Tài khoản mới là khách hàng. Quyền nhân viên và quản lý do quản lý
              cửa hàng cấp.
            </p>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="button full-width" disabled={busy} type="submit">
            {busy ? (
              <>
                <LoaderCircle size={19} className="spin" /> Đang xử lý…
              </>
            ) : register ? (
              "Đăng ký"
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <Link to={`${register ? "/dang-nhap" : "/dang-ky"}${suffix}`}>
            {register ? "Đăng nhập" : "Đăng ký ngay"}
          </Link>
        </p>
        <Link to="/san-pham" className="auth-browse">
          Tiếp tục xem sản phẩm
        </Link>
      </section>
    </main>
  );
}

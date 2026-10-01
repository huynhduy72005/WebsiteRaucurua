import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone, MapPin, MessageCircle, Send, CheckCircle2 } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { api } from "../../services/api";
export default function ContactPage() {
  const { user, storeSettings } = useShop();
  const [form, setForm] = useState({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      message: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ticket, setTicket] = useState(null);
  useEffect(() => {
    if (user)
      setForm((current) => ({
        ...current,
        name: current.name || user.name,
        email: current.email || user.email,
        phone: current.phone || user.phone || "",
      }));
  }, [user?.id]);
  async function send(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api("/inquiries", { method: "POST", body: form });
      setTicket(data.id);
      setForm({ ...form, message: "" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTicket(null);
  }
  const phone = storeSettings?.storePhone?.replace(/[^+0-9]/g, "");
  return (
    <main className="container page content-page contact-page">
      <div className="content-page-heading">
        <span className="eyebrow">CHÚNG TÔI Ở ĐÂY ĐỂ LẮNG NGHE</span>
        <h1>Gửi một lời nhắn cho khu vườn.</h1>
        <p>
          Hỏi về sản phẩm, đơn hàng hoặc góp ý để cửa hàng phục vụ bạn tốt hơn.
        </p>
      </div>
      <div className="contact-layout">
        <aside className="contact-info">
          <MessageCircle size={32} />
          <h2>{storeSettings?.storeName || "Vườn Nhà"}</h2>
          <p>Mỗi lời nhắn giúp chúng tôi hiểu điều bạn cần.</p>
          <div>
            <Phone size={21} />
            <span>
              <small>Điện thoại</small>
              {phone ? (
                <a href={`tel:${phone}`}>{storeSettings.storePhone}</a>
              ) : (
                <strong>Liên hệ qua biểu mẫu</strong>
              )}
            </span>
          </div>
          <div>
            <MapPin size={21} />
            <span>
              <small>Địa chỉ cửa hàng</small>
              <strong>
                {storeSettings?.storeAddress || "Chưa cập nhật địa chỉ"}
              </strong>
            </span>
          </div>
          <Link to="/huong-dan" className="text-link">
            Xem hướng dẫn & câu hỏi thường gặp
          </Link>
          <img src="/images/orange.jpg" alt="Cam vàng" loading="lazy" />
        </aside>
        <form className="form-panel contact-form" onSubmit={send}>
          <h2>Bạn muốn hỏi điều gì?</h2>
          {!user && (
            <p className="contact-login-note">
              <Link to="/dang-nhap?next=/lien-he">Đăng nhập trước khi gửi</Link>{" "}
              để theo dõi phản hồi trong tài khoản. Bạn vẫn có thể gửi bằng
              thông tin liên hệ của mình.
            </p>
          )}
          <fieldset className="admin-form-fields" disabled={busy}>
            <div className="form-two-columns">
              <label>
                Họ và tên
                <input
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                  value={form.name}
                  onChange={change}
                />
              </label>
              <label>
                Email liên hệ
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={form.email}
                  onChange={change}
                />
              </label>
            </div>
            <label>
              Số điện thoại (không bắt buộc)
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={20}
                value={form.phone}
                onChange={change}
              />
            </label>
            <label>
              Nội dung liên hệ
              <textarea
                name="message"
                aria-label="Nội dung liên hệ"
                rows={6}
                minLength={10}
                maxLength={2000}
                required
                value={form.message}
                onChange={change}
                placeholder="Mô tả điều bạn cần hỗ trợ. Nếu hỏi về đơn hàng, hãy ghi mã đơn."
              />
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {ticket && (
            <div className="contact-success" role="status">
              <CheckCircle2 size={21} />
              <span>
                Đã gửi yêu cầu #{ticket}.
                {user && (
                  <Link to="/tai-khoan?tab=support">
                    {" "}
                    Xem yêu cầu trong Tài khoản → Hỗ trợ.
                  </Link>
                )}
              </span>
            </div>
          )}
          <button className="button" disabled={busy}>
            <Send size={17} />
            {busy ? "Đang gửi…" : "Gửi lời nhắn"}
          </button>
        </form>
      </div>
    </main>
  );
}

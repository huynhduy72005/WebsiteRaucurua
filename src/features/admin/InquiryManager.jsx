import { useState, useEffect } from "react";
import { Mail, Save } from "lucide-react";
import { api } from "../../services/api";
import { formatDate as dateTime } from "../../services/orders";
import { useShop } from "../../context/ShopContext";
import { Loading, ErrorMessage } from "../../components/Feedback";
const statusNames = { new: "Mới gửi", read: "Đã đọc", resolved: "Đã xử lý" };
function InquiryEditor({ item, onSaved }) {
  const { showToast } = useShop();
  const [status, setStatus] = useState(item.status),
    [reply, setReply] = useState(item.reply),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api(`/inquiries/${item.id}`, {
        method: "PATCH",
        body: { status, reply },
      });
      onSaved(data.inquiry);
      showToast("Đã lưu xử lý liên hệ.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-panel inquiry-editor" onSubmit={save}>
      <h3>Yêu cầu #{item.id}</h3>
      <p>{dateTime(item.created_at)}</p>
      <dl className="profile-details">
        <div>
          <dt>Người gửi</dt>
          <dd>{item.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{item.email}</dd>
        </div>
        <div>
          <dt>Điện thoại</dt>
          <dd>{item.phone || "Chưa cung cấp"}</dd>
        </div>
      </dl>
      <p className="inquiry-message">{item.message}</p>
      <label>
        Trạng thái
        <select
          aria-label="Trạng thái liên hệ"
          value={status}
          disabled={busy}
          onChange={(e) => setStatus(e.target.value)}
        >
          {Object.entries(statusNames).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Phản hồi
        <textarea
          rows={4}
          aria-label="Phản hồi"
          value={reply}
          maxLength={2000}
          disabled={busy}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Nội dung trả lời hoặc hướng dẫn cho khách…"
        />
      </label>
      <p className="admin-subtext">
        {item.user_id
          ? "Khách xem phản hồi tại Tài khoản → Hỗ trợ."
          : "Khách gửi khi chưa đăng nhập. Phản hồi được lưu nội bộ; hãy liên hệ qua thông tin khách cung cấp. Website chưa gửi email tự động."}
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        <Save size={16} />
        {busy ? "Đang lưu…" : "Lưu phản hồi"}
      </button>
    </form>
  );
}
export default function InquiryManager() {
  const [items, setItems] = useState([]),
    [selected, setSelected] = useState(null),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems((await api("/inquiries?scope=all")).inquiries);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const current = items.find((i) => i.id === selected),
    visible = items.filter((i) => filter === "all" || i.status === filter);
  return (
    <section>
      <div className="admin-section-heading">
        <div>
          <h2>Liên hệ & hỗ trợ</h2>
          <p>200 yêu cầu gần nhất từ biểu mẫu Liên hệ.</p>
        </div>
        <label>
          <span className="sr-only">Lọc liên hệ</span>
          <select
            aria-label="Lọc liên hệ"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(statusNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : (
        <div className="inquiry-layout">
          <div className="inquiry-list">
            {visible.length ? (
              visible.map((i) => (
                <button
                  key={i.id}
                  className={selected === i.id ? "selected" : ""}
                  onClick={() => setSelected(i.id)}
                >
                  <span>
                    <Mail size={16} /> #{i.id} · {statusNames[i.status]}
                  </span>
                  <strong>{i.name}</strong>
                  <small>{i.message}</small>
                </button>
              ))
            ) : (
              <div className="admin-empty">Chưa có yêu cầu phù hợp.</div>
            )}
          </div>
          {current ? (
            <InquiryEditor
              key={current.id}
              item={current}
              onSaved={(updated) =>
                setItems(items.map((i) => (i.id === updated.id ? updated : i)))
              }
            />
          ) : (
            <div className="admin-empty">
              Chọn một yêu cầu để xem và phản hồi.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

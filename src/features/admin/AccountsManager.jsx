import { useState, useEffect } from "react";
import { Eye, Search, RefreshCw } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { api, roleNames, normalizeText } from "../../services/api";
import { Loading, ErrorMessage } from "../../components/Feedback";
import UserDetail from "./UserDetail";
export default function AccountsManager() {
  const { user, showToast } = useShop();
  const [users, setUsers] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(null);
  const [query, setQuery] = useState(""),
    [role, setRole] = useState("all"),
    [selected, setSelected] = useState(null);
  async function load() {
    setError("");
    setLoading(true);
    try {
      setUsers((await api("/users")).users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function roleChange(person, role) {
    setBusy(person.id);
    try {
      await api(`/users/${person.id}/role`, {
        method: "PATCH",
        body: { role },
      });
      setUsers((current) =>
        current.map((u) => (u.id === person.id ? { ...u, role } : u)),
      );
      showToast("Đã cập nhật quyền tài khoản.");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(null);
    }
  }
  const visible = users.filter(
    (u) =>
      (role === "all" || u.role === role) &&
      normalizeText(`${u.name} ${u.email} ${u.phone}`).includes(
        normalizeText(query),
      ),
  );
  const person = users.find((u) => u.id === selected);
  return (
    <section>
      <div className="admin-section-heading">
        <div>
          <h2>Tài khoản & thông tin khách hàng</h2>
          <p>Xem hồ sơ khách hàng, nhân viên và cấp quyền làm việc.</p>
        </div>
        <button
          className="button secondary"
          disabled={loading || busy !== null}
          onClick={load}
        >
          <RefreshCw size={16} />
          Tải lại
        </button>
      </div>
      <div className="admin-product-filters">
        <label className="admin-search">
          <Search size={18} />
          <input
            aria-label="Tìm tài khoản"
            placeholder="Tên, email hoặc số điện thoại…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Lọc vai trò tài khoản</span>
          <select
            aria-label="Lọc vai trò tài khoản"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="all">Mọi vai trò</option>
            {Object.entries(roleNames).map(([id, name]) => (
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
        <div
          className={
            person
              ? "admin-accounts-layout with-detail"
              : "admin-accounts-layout"
          }
        >
          <div className="accounts-list">
            {visible.length ? (
              visible.map((p) => (
                <article className="account-row" key={p.id}>
                  <span className="avatar">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <strong>
                      {p.name}
                      {p.id === user.id ? " (Bạn)" : ""}
                    </strong>
                    <small>{p.email}</small>
                    <small>{p.phone || "Chưa có số điện thoại"}</small>
                  </div>
                  <label>
                    <span className="sr-only">Vai trò của {p.name}</span>
                    <select
                      aria-label={`Vai trò của ${p.name}`}
                      value={p.role}
                      disabled={p.id === user.id || busy !== null}
                      onChange={(e) => roleChange(p, e.target.value)}
                    >
                      {Object.entries(roleNames).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button secondary"
                    aria-label={`Xem hồ sơ ${p.name}`}
                    onClick={() => setSelected(p.id)}
                  >
                    <Eye size={16} />
                    Xem
                  </button>
                </article>
              ))
            ) : (
              <div className="admin-empty">
                Không tìm thấy tài khoản phù hợp.
              </div>
            )}
          </div>
          {person && (
            <UserDetail
              key={`${person.id}-${person.role}`}
              userId={person.id}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      )}
    </section>
  );
}

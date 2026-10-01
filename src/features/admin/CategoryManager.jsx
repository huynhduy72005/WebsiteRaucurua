import { useState } from "react";
import { Plus, Pencil, Trash2, Save, Layers3 } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { api } from "../../services/api";
const blank = { name: "", description: "", sort_order: 0 };
export default function CategoryManager() {
  const { categories, loadProducts, showToast } = useShop();
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function edit(category) {
    setError("");
    setForm(
      category || {
        ...blank,
        sort_order: Math.max(0, ...categories.map((c) => c.sort_order)) + 1,
      },
    );
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(form.id ? `/categories/${form.id}` : "/categories", {
        method: form.id ? "PUT" : "POST",
        body: {
          ...form,
          sort_order: Number(form.sort_order),
          expectedRevision: form.revision,
        },
      });
      await loadProducts();
      setForm(null);
      showToast("Đã lưu danh mục. Menu và bộ lọc đã cập nhật");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(category) {
    if (!window.confirm(`Xóa danh mục "${category.name}"?`)) return;
    setBusy(true);
    try {
      await api(`/categories/${category.id}`, {
        method: "DELETE",
        body: { expectedRevision: category.revision },
      });
      await loadProducts();
      showToast("Đã xóa danh mục.");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="category-manager">
      <div className="admin-section-heading">
        <div>
          <h2>Danh mục sản phẩm</h2>
          <p>
            Nhóm sản phẩm hiển thị trong menu xổ xuống, trang chủ và bộ lọc.
          </p>
        </div>
        <button
          className="button"
          disabled={busy || Boolean(form)}
          onClick={() => edit(null)}
        >
          <Plus size={17} />
          Thêm danh mục
        </button>
      </div>
      {form && (
        <form className="form-panel" onSubmit={save}>
          <h3>{form.id ? "Sửa danh mục" : "Danh mục mới"}</h3>
          <fieldset className="admin-form-fields" disabled={busy}>
            <div className="form-two-columns">
              <label>
                Tên danh mục
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Thứ tự hiển thị
                <input
                  type="number"
                  min={0}
                  max={999}
                  step={1}
                  required
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Mô tả ngắn
              <textarea
                rows={2}
                aria-label="Mô tả ngắn"
                maxLength={250}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
          </fieldset>
          {form.id && (
            <p className="admin-subtext">
              Mã {form.id} được giữ để các liên kết sản phẩm tiếp tục hoạt động.
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="admin-form-actions">
            <button className="button" disabled={busy}>
              <Save size={17} />
              {busy ? "Đang lưu…" : "Lưu danh mục"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setForm(null)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}
      <p className="admin-note">
        Chỉ xóa danh mục rỗng. Nếu còn sản phẩm, hãy sửa sản phẩm để chuyển sang
        nhóm khác trước; áp dụng cả sản phẩm đã xóa khỏi cửa hàng.
      </p>
      {!categories.length ? (
        <div className="admin-empty">
          Chưa có danh mục. Bấm Thêm danh mục để bắt đầu.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Danh mục</th>
                <th>Đang bán / Tổng</th>
                <th>Thứ tự</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>
                      <Layers3 size={16} /> {c.name}
                    </strong>
                    <small>{c.description || c.id}</small>
                  </td>
                  <td>
                    {c.productCount} / {c.totalProducts}
                  </td>
                  <td>{c.sort_order}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        className="button secondary"
                        aria-label={`Sửa danh mục ${c.name}`}
                        disabled={busy || Boolean(form)}
                        onClick={() => edit(c)}
                      >
                        <Pencil size={15} />
                        Sửa
                      </button>
                      <button
                        className="button admin-danger"
                        aria-label={`Xóa danh mục ${c.name}`}
                        disabled={busy || Boolean(form) || c.totalProducts > 0}
                        title={
                          c.totalProducts > 0
                            ? "Chuyển các sản phẩm sang danh mục khác trước"
                            : "Xóa danh mục"
                        }
                        onClick={() => remove(c)}
                      >
                        <Trash2 size={15} />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

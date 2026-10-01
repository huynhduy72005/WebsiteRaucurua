import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  RefreshCw,
  Search,
} from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { api, money, allCategory } from "../../services/api";
import { Loading, ErrorMessage } from "../../components/Feedback";
import ProductForm from "./ProductForm";
import StockRow from "./StockRow";
const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");
export default function ProductManager() {
  const { user, categories, loadProducts, refreshCart, showToast } = useShop();
  const manager = user.role === "manager";
  const [products, setProducts] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [status, setStatus] = useState("active");
  const [editor, setEditor] = useState(null),
    [busy, setBusy] = useState(null);
  const editorAnchor = useRef(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setProducts((await api("/products/manage")).products);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function refresh() {
    await load();
    await loadProducts();
    try {
      await refreshCart();
    } catch (e) {
      showToast(e.message, "error");
    }
  }
  function open(product) {
    setEditor(product || {});
    editorAnchor.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
  async function saved(product) {
    setEditor(null);
    setStatus(product.is_active ? "active" : "deleted");
    setCategory("all");
    setSearch("");
    await refresh();
    showToast(`Đã lưu ${product.name} vào Database.`);
  }
  async function archive(product) {
    if (
      !window.confirm(
        `Xóa "${product.name}" khỏi cửa hàng? Các đơn hàng và hóa đơn cũ vẫn được giữ. Bạn có thể khôi phục sản phẩm sau.`,
      )
    )
      return;
    await action(
      product,
      "DELETE",
      `/products/${product.id}`,
      "Đã xóa sản phẩm khỏi cửa hàng.",
    );
  }
  async function action(product, method, path, message) {
    setBusy(product.id);
    try {
      await api(path, { method, body: { expectedRevision: product.revision } });
      if (editor?.id === product.id) setEditor(null);
      await refresh();
      showToast(message);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(null);
    }
  }
  const visible = products.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (status === "all" || Boolean(p.is_active) === (status === "active")) &&
      normalize(`${p.name} ${p.origin} ${p.id}`).includes(normalize(search)),
  );
  return (
    <section className="admin-products">
      <div className="admin-section-heading">
        <div>
          <h2>Quản lý sản phẩm</h2>
          <p>
            {manager
              ? "Thêm, sửa thông tin, giá bán và tồn kho của cửa hàng."
              : "Cập nhật giá bán và tồn kho. Quản lý có quyền thêm, sửa toàn bộ và xóa sản phẩm."}
          </p>
        </div>
        {manager && (
          <button
            className="button"
            onClick={() => open(null)}
            disabled={busy !== null || Boolean(editor) || !categories.length}
          >
            <Plus size={18} />
            Thêm sản phẩm
          </button>
        )}
      </div>
      {manager && !categories.length && (
        <p className="admin-note">
          Hãy tạo ít nhất một danh mục ở tab Danh mục sản phẩm trước khi thêm
          sản phẩm.
        </p>
      )}
      <div ref={editorAnchor} className="admin-editor-anchor" />
      {manager && editor && (
        <ProductForm
          key={editor.id || "new"}
          product={editor.id ? editor : null}
          onSaved={saved}
          onCancel={() => setEditor(null)}
        />
      )}
      <div className="admin-product-filters">
        <label className="admin-search">
          <Search size={18} />
          <input
            aria-label="Tìm sản phẩm trong Admin"
            placeholder="Tìm tên, mã hoặc xuất xứ…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Danh mục</span>
          <select
            aria-label="Danh mục sản phẩm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[allCategory, ...categories].map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {manager && (
          <label>
            <span className="sr-only">Trạng thái sản phẩm</span>
            <select
              aria-label="Trạng thái sản phẩm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Đang bán</option>
              <option value="deleted">Đã xóa</option>
              <option value="all">Mọi trạng thái</option>
            </select>
          </label>
        )}
        <button
          className="button secondary"
          onClick={refresh}
          disabled={loading || busy !== null || Boolean(editor)}
        >
          <RefreshCw size={16} />
          Tải lại
        </button>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : (
        <>
          <p className="admin-result-count">
            {visible.length} sản phẩm
            {manager && status === "deleted"
              ? " đã xóa — có thể khôi phục để bán lại"
              : ""}
          </p>
          {manager && visible.length > 0 && (
            <p className="admin-table-hint">
              Vuốt ngang bảng để xem giá, tồn kho và nút Sửa/Xóa.
            </p>
          )}
          {!visible.length ? (
            <div className="admin-empty">
              Chưa có sản phẩm phù hợp.
              {manager && status === "active" && (
                <p>Bấm Thêm sản phẩm để tạo sản phẩm mới.</p>
              )}
            </div>
          ) : manager ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá / đơn vị</th>
                    <th>Tồn kho</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="inventory-product">
                          <img src={p.image} alt="" loading="lazy" />
                          <span>
                            <strong>{p.name}</strong>
                            <small>
                              #{p.id} · {p.origin}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td>
                        {categories.find((c) => c.id === p.category)?.name}
                      </td>
                      <td>
                        <strong>{money(p.price)}</strong>
                        <small>/ {p.unit}</small>
                      </td>
                      <td>
                        <span
                          className={
                            p.stock === 0
                              ? "admin-stock empty-stock"
                              : p.stock <= 10
                                ? "admin-stock low-stock"
                                : "admin-stock"
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-status ${p.is_active ? "active" : "archived"}`}
                        >
                          {p.is_active ? "Đang bán" : "Đã xóa"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            className="button secondary"
                            disabled={busy !== null || Boolean(editor)}
                            onClick={() => open(p)}
                            aria-label={`Sửa ${p.name}`}
                          >
                            <Pencil size={15} />
                            Sửa
                          </button>
                          {p.is_active ? (
                            <button
                              className="button admin-danger"
                              disabled={busy !== null || Boolean(editor)}
                              onClick={() => archive(p)}
                              aria-label={`Xóa ${p.name}`}
                            >
                              <Trash2 size={15} />
                              Xóa
                            </button>
                          ) : (
                            <button
                              className="button secondary"
                              disabled={busy !== null || Boolean(editor)}
                              onClick={() =>
                                action(
                                  p,
                                  "POST",
                                  `/products/${p.id}/restore`,
                                  "Đã khôi phục sản phẩm.",
                                )
                              }
                              aria-label={`Khôi phục ${p.name}`}
                            >
                              <RotateCcw size={15} />
                              Khôi phục
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="inventory">
              <div className="inventory-header">
                <span>Sản phẩm</span>
                <span>Giá / đơn vị (đ)</span>
                <span>Tồn kho</span>
                <span>Thao tác</span>
              </div>
              {visible.map((p) => (
                <StockRow key={p.id} p={p} onSaved={refresh} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

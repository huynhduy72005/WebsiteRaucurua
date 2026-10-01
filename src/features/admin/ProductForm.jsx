import { useState } from "react";
import { Save, X, Image as ImageIcon } from "lucide-react";
import { api } from "../../services/api";
import { useShop } from "../../context/ShopContext";
const blankProduct = {
  name: "",
  category: "rau",
  price: "",
  unit: "500g",
  stock: 0,
  image: "",
  origin: "",
  tag: "",
  description: "",
};
export default function ProductForm({ product, onSaved, onCancel }) {
  const { categories } = useShop();
  const [form, setForm] = useState(
    product || { ...blankProduct, category: categories[0]?.id || "" },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  function change(e) {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
    if (e.target.name === "image") setImageFailed(false);
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        expectedRevision: product?.revision,
      };
      const data = await api(
        product ? `/products/${product.id}` : "/products",
        { method: product ? "PUT" : "POST", body },
      );
      await onSaved(data.product);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  const previewAllowed =
    form.image.startsWith("/images/") || form.image.startsWith("https://");
  return (
    <form className="form-panel admin-product-form" onSubmit={save}>
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow">THÔNG TIN SẢN PHẨM</span>
          <h2>
            {product ? `Sửa sản phẩm #${product.id}` : "Thêm sản phẩm mới"}
          </h2>
        </div>
        <button
          type="button"
          className="admin-icon-button"
          aria-label="Đóng biểu mẫu"
          disabled={busy}
          onClick={onCancel}
        >
          <X size={20} />
        </button>
      </div>
      {product && !product.is_active && (
        <p className="admin-note">
          Sản phẩm đang ở mục đã xóa. Sửa thông tin rồi bấm Khôi phục trong danh
          sách để bán lại.
        </p>
      )}
      <fieldset disabled={busy} className="admin-form-fields">
        <div className="form-two-columns">
          <label>
            Tên sản phẩm *
            <input
              autoFocus
              name="name"
              value={form.name}
              onChange={change}
              minLength={2}
              maxLength={120}
              required
              placeholder="Ví dụ: Cải bó xôi"
            />
          </label>
          <label>
            Danh mục *
            <select
              aria-label="Danh mục sản phẩm"
              name="category"
              required
              value={form.category}
              onChange={change}
            >
              {categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Giá bán / đơn vị (đ) *
            <input
              name="price"
              type="number"
              min={1000}
              max={100000000}
              step={1}
              required
              value={form.price}
              onChange={change}
            />
          </label>
          <label>
            Đơn vị bán *
            <input
              name="unit"
              required
              maxLength={30}
              value={form.unit}
              onChange={change}
              placeholder="500g, 1kg, 1 bó…"
            />
          </label>
          <label>
            Tồn kho (số đơn vị bán) *
            <input
              name="stock"
              type="number"
              min={0}
              max={1000000}
              step={1}
              required
              value={form.stock}
              onChange={change}
            />
          </label>
          <label>
            Xuất xứ *
            <input
              name="origin"
              minLength={2}
              maxLength={120}
              required
              value={form.origin}
              onChange={change}
              placeholder="Ví dụ: Đà Lạt"
            />
          </label>
        </div>
        <label>
          Nhãn trên thẻ sản phẩm
          <input
            name="tag"
            maxLength={40}
            value={form.tag}
            onChange={change}
            placeholder="Ví dụ: Mới về, Theo mùa (có thể bỏ trống)"
          />
        </label>
        <div className="admin-image-field">
          <label>
            Đường dẫn ảnh *
            <input
              name="image"
              maxLength={1000}
              required
              value={form.image}
              onChange={change}
              placeholder="/images/cai-bo-xoi.jpg hoặc https://…"
            />
            <small>
              Chép ảnh vào thư mục public/images rồi nhập /images/tên-ảnh.jpg;
              hoặc dán URL HTTPS của ảnh. Database lưu đường dẫn ảnh.
            </small>
          </label>
          <div className="admin-image-preview">
            {previewAllowed && !imageFailed ? (
              <img
                src={form.image}
                alt="Ảnh xem trước"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span>
                <ImageIcon size={26} />
                {imageFailed ? "Không tải được ảnh" : "Xem trước ảnh"}
              </span>
            )}
          </div>
        </div>
        <label>
          Mô tả sản phẩm *
          <textarea
            name="description"
            aria-label="Mô tả sản phẩm *"
            rows={4}
            minLength={10}
            maxLength={4000}
            required
            value={form.description}
            onChange={change}
            placeholder="Đặc điểm, cách sử dụng và bảo quản…"
          />
        </label>
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-form-actions">
        <button className="button" disabled={busy}>
          <Save size={18} />
          {busy ? "Đang lưu…" : "Lưu sản phẩm"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={onCancel}
          disabled={busy}
        >
          Hủy
        </button>
        <small>Dữ liệu được lưu vào Database của máy chủ.</small>
      </div>
    </form>
  );
}

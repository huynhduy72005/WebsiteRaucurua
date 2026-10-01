import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { api } from "../../services/api";
export default function StockRow({ p, onSaved }) {
  const { showToast } = useShop();
  const [price, setPrice] = useState(p.price),
    [stock, setStock] = useState(p.stock),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setPrice(p.price);
    setStock(p.stock);
  }, [p.price, p.stock]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/products/${p.id}`, {
        method: "PATCH",
        body: {
          price: Number(price),
          stock: Number(stock),
          expectedRevision: p.revision,
        },
      });
      await onSaved();
      showToast(`Đã cập nhật ${p.name.toLowerCase()}.`);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="inventory-row" onSubmit={save}>
      <div className="inventory-product">
        <img src={p.image} alt="" />
        <span>
          <strong>{p.name}</strong>
          <small>
            {p.unit} · {p.origin}
          </small>
        </span>
      </div>
      <label>
        <span className="mobile-label">Giá (đ)</span>
        <input
          aria-label={`Giá ${p.name}`}
          type="number"
          min="1000"
          max="100000000"
          step="1"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      <label>
        <span className="mobile-label">Tồn kho</span>
        <input
          aria-label={`Tồn kho ${p.name}`}
          type="number"
          min="0"
          max="1000000"
          step="1"
          required
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </label>
      <button
        className="button secondary"
        disabled={
          busy || (Number(price) === p.price && Number(stock) === p.stock)
        }
      >
        <Save size={16} />
        {busy ? "Đang lưu" : "Lưu"}
      </button>
    </form>
  );
}

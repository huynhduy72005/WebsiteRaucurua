import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, PackageSearch } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { allCategory, normalizeText } from "../../services/api";
import { Loading, ErrorMessage } from "../../components/Feedback";
import ProductCard from "./ProductCard";
const normalize = normalizeText;
export default function ProductsPage() {
  const { products, categories, loading, error, loadProducts } = useShop();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "",
    category = params.get("category") || "all",
    sort = params.get("sort") || "default";
  function update(key, value) {
    const next = new URLSearchParams(params);
    value && value !== "all" && value !== "default"
      ? next.set(key, value)
      : next.delete(key);
    setParams(next, { replace: true });
  }
  let list = products.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      normalize(`${p.name} ${p.origin}`).includes(normalize(query.trim())),
  );
  if (sort === "asc") list.sort((a, b) => a.price - b.price);
  if (sort === "desc") list.sort((a, b) => b.price - a.price);
  return (
    <main className="container page">
      <div className="page-heading">
        <span className="eyebrow">GÓC VƯỜN NHÀ</span>
        <h1>Rau xanh, quả ngọt</h1>
        <p>Chọn món ngon cho bữa ăn của bạn.</p>
      </div>
      <div className="catalog-toolbar">
        <div className="category-tabs">
          {[allCategory, ...categories].map((c) => (
            <button
              key={c.id}
              className={category === c.id ? "active" : ""}
              onClick={() => update("category", c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <label className="sort-control">
          <SlidersHorizontal size={17} />
          <span className="sr-only">Sắp xếp sản phẩm</span>
          <select value={sort} onChange={(e) => update("sort", e.target.value)}>
            <option value="default">Mặc định</option>
            <option value="asc">Giá: thấp đến cao</option>
            <option value="desc">Giá: cao đến thấp</option>
          </select>
        </label>
      </div>
      <div className="catalog-search-row">
        <div className="catalog-search">
          <Search size={18} />
          <input
            aria-label="Lọc sản phẩm theo tên hoặc xuất xứ"
            placeholder="Tìm tên sản phẩm hoặc xuất xứ…"
            value={query}
            onChange={(e) => update("q", e.target.value)}
          />
          {query && (
            <button aria-label="Xóa tìm kiếm" onClick={() => update("q", "")}>
              <X size={17} />
            </button>
          )}
        </div>
        <span>{list.length} sản phẩm</span>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={loadProducts} />
      ) : list.length ? (
        <div className="product-grid">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <PackageSearch size={48} />
          <h2>Chưa tìm thấy món bạn cần</h2>
          <p>Thử tên khác hoặc xem tất cả danh mục.</p>
          <button className="button secondary" onClick={() => setParams({})}>
            Xem tất cả sản phẩm
          </button>
        </div>
      )}
    </main>
  );
}

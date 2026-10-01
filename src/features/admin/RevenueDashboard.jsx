import { useEffect, useState } from "react";
import {
  Banknote,
  ShoppingBag,
  TrendingUp,
  Truck,
  Download,
  Package,
  RefreshCw,
} from "lucide-react";
import { api, money } from "../../services/api";
import { Loading, ErrorMessage } from "../../components/Feedback";
const vnToday = () => {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};
const displayDate = (date) => date.split("-").reverse().join("/");
const methodNames = {
  cod: "Tiền mặt / COD",
  bank: "Chuyển khoản",
  vnpay: "VNPay",
};
export default function RevenueDashboard() {
  const today = vnToday();
  const [range, setRange] = useState({
    from: today.slice(0, 8) + "01",
    to: today,
  });
  const [report, setReport] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      setReport(
        (await api(`/admin/revenue?${new URLSearchParams(range)}`)).report,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function csv() {
    const text =
      "\uFEFFNgày,Doanh thu hàng hóa (VND),Số đơn đã thanh toán\r\n" +
      report.days.map((d) => `${d.day},${d.revenue},${d.orders}`).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `doanh-thu-${report.from}-${report.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const maximum = report
    ? Math.max(...report.days.map((d) => d.revenue), 1)
    : 1;
  return (
    <section className="admin-dashboard">
      <div className="admin-section-heading">
        <div>
          <h2>Tổng quan & doanh thu</h2>
          <p>Theo dõi tiền đã thu, đơn hàng và tình hình kho.</p>
        </div>
        <button
          className="button secondary"
          disabled={!report || busy || Boolean(error)}
          onClick={csv}
        >
          <Download size={17} />
          Xuất báo cáo CSV
        </button>
      </div>
      <form
        className="admin-date-filter"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <label>
          Từ ngày
          <input
            type="date"
            required
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            required
            min={range.from}
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </label>
        <button className="button" disabled={busy}>
          <RefreshCw size={16} />
          {busy ? "Đang tải…" : "Xem báo cáo"}
        </button>
        <small>Tối đa 366 ngày · Giờ Việt Nam</small>
      </form>
      {busy ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : (
        report && (
          <>
            <p className="admin-period">
              Kỳ báo cáo:{" "}
              <strong>
                {displayDate(report.from)} – {displayDate(report.to)}
              </strong>
            </p>
            <div className="admin-metric-grid">
              <article className="admin-metric featured">
                <TrendingUp size={22} />
                <span>Doanh thu hàng hóa</span>
                <strong>{money(report.summary.productRevenue)}</strong>
                <small>Đơn đã thanh toán · Không gồm phí giao hàng</small>
              </article>
              <article className="admin-metric">
                <Banknote size={22} />
                <span>Tổng tiền đã thu</span>
                <strong>{money(report.summary.collectedTotal)}</strong>
                <small>
                  Gồm {money(report.summary.shippingCollected)} phí giao hàng
                </small>
              </article>
              <article className="admin-metric">
                <ShoppingBag size={22} />
                <span>Đơn đã thanh toán</span>
                <strong>{report.summary.paidOrders}</strong>
                <small>Theo ngày xác nhận thanh toán</small>
              </article>
              <article className="admin-metric">
                <Truck size={22} />
                <span>Đơn tạo trong kỳ</span>
                <strong>{report.summary.createdOrders}</strong>
                <small>
                  {report.summary.unpaidOrders} chưa thanh toán ·{" "}
                  {report.summary.cancelledOrders} đã hủy
                </small>
              </article>
            </div>
            <p className="admin-note">
              Doanh thu tính theo ngày nhận tiền của đơn đã xác nhận thanh toán,
              loại trừ đơn đã hủy. Chưa trừ giá vốn và chi phí, nên chưa phải
              lợi nhuận. Số đơn tạo trong kỳ tính theo ngày đặt đơn.
            </p>
            <article className="admin-panel">
              <div className="admin-section-heading">
                <h3>Doanh thu theo ngày</h3>
                <strong>{money(report.summary.productRevenue)}</strong>
              </div>
              {report.summary.paidOrders === 0 ? (
                <div className="admin-empty">
                  Chưa có đơn đã thanh toán trong khoảng ngày này.
                </div>
              ) : (
                <>
                  <div className="admin-chart-scroll">
                    <div
                      className="admin-bar-chart"
                      style={{
                        minWidth: Math.max(320, report.days.length * 18),
                      }}
                      role="img"
                      aria-label="Biểu đồ doanh thu hàng hóa theo ngày. Xem số liệu đầy đủ bên dưới."
                    >
                      {report.days.map((d) => (
                        <div
                          className="admin-bar-slot"
                          key={d.day}
                          title={`${displayDate(d.day)}: ${money(d.revenue)} · ${d.orders} đơn`}
                        >
                          <div
                            className="admin-bar"
                            style={{
                              height: `${(d.revenue / maximum) * 100}%`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="admin-chart-axis">
                    <span>{displayDate(report.from)}</span>
                    <small>Cột cao nhất: {money(maximum)}</small>
                    <span>{displayDate(report.to)}</span>
                  </div>
                </>
              )}
              <details className="admin-daily-details">
                <summary>Xem bảng số liệu theo ngày</summary>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Đơn đã thanh toán</th>
                        <th>Doanh thu hàng hóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.days.map((d) => (
                        <tr key={d.day}>
                          <td>{displayDate(d.day)}</td>
                          <td>{d.orders}</td>
                          <td>{money(d.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </article>
            <div className="admin-dashboard-columns">
              <article className="admin-panel">
                <h3>Sản phẩm bán chạy trong kỳ</h3>
                <p className="admin-subtext">
                  Xếp theo doanh thu từ đơn đã thanh toán.
                </p>
                {!report.topProducts.length ? (
                  <div className="admin-empty">Chưa có dữ liệu bán hàng.</div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>Đã bán</th>
                          <th>Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.topProducts.map((p, i) => (
                          <tr key={`${p.id}-${i}`}>
                            <td>
                              <strong>{p.name}</strong>
                              <small>
                                #{p.id} · {p.unit}
                              </small>
                            </td>
                            <td>{p.quantity}</td>
                            <td>{money(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
              <article className="admin-panel">
                <h3>Tiền thu theo phương thức</h3>
                <p className="admin-subtext">Bao gồm phí giao hàng.</p>
                {!report.paymentMethods.length ? (
                  <div className="admin-empty">Chưa ghi nhận thanh toán.</div>
                ) : (
                  <div className="admin-payment-summary">
                    {report.paymentMethods.map((p) => (
                      <div key={p.method}>
                        <span>
                          {methodNames[p.method]}
                          <small>{p.orders} đơn</small>
                        </span>
                        <strong>{money(p.collected)}</strong>
                      </div>
                    ))}
                  </div>
                )}
                <h3 className="admin-inventory-title">
                  <Package size={19} /> Kho hiện tại
                </h3>
                <div className="admin-inventory-summary">
                  <div>
                    <span>Sản phẩm đang bán</span>
                    <strong>{report.inventory.activeProducts}</strong>
                  </div>
                  <div>
                    <span>Đơn vị còn trong kho</span>
                    <strong>{report.inventory.unitsInStock}</strong>
                  </div>
                  <div>
                    <span>Hết hàng</span>
                    <strong>{report.inventory.outOfStock}</strong>
                  </div>
                  <div>
                    <span>Sắp hết (1–10 đơn vị)</span>
                    <strong>{report.inventory.lowStock}</strong>
                  </div>
                </div>
              </article>
            </div>
          </>
        )
      )}
    </section>
  );
}

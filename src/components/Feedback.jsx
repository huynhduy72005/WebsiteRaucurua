import { CheckCircle2, AlertCircle, X, LoaderCircle } from "lucide-react";
import { useShop } from "../context/ShopContext";
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={26} /> Đang tải…
    </div>
  );
}
export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-panel" role="alert">
      <AlertCircle size={24} />
      <p>{message}</p>
      {onRetry && (
        <button className="button secondary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export default function Feedback() {
  const { toast, setToast } = useShop();
  return (
    toast && (
      <div
        className={`toast ${toast.type}`}
        role={toast.type === "error" ? "alert" : "status"}
      >
        {toast.type === "error" ? (
          <AlertCircle size={21} />
        ) : (
          <CheckCircle2 size={21} />
        )}
        <span>{toast.message}</span>
        <button aria-label="Đóng thông báo" onClick={() => setToast(null)}>
          <X size={18} />
        </button>
      </div>
    )
  );
}

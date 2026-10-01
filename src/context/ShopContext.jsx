import { createContext, useContext, useEffect, useState, useRef } from "react";
import { api } from "../services/api";
const Context = createContext(null);
const guestKey = "vuon-nha-guest-cart";
function readGuest() {
  try {
    const value = JSON.parse(localStorage.getItem(guestKey) || "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (i) =>
              Number.isInteger(i.id) &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 999,
          )
          .slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function ShopProvider({ children }) {
  const [products, setProducts] = useState([]),
    [categories, setCategories] = useState([]),
    [storeSettings, setStoreSettings] = useState(null),
    [user, setUser] = useState(null),
    [authReady, setAuthReady] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [cart, setCart] = useState([]),
    [favorites, setFavorites] = useState([]),
    [guest, setGuest] = useState(readGuest),
    [notifications, setNotifications] = useState([]),
    [toast, setToast] = useState(null),
    [cartBusy, setCartBusy] = useState(false);
  const timer = useRef(),
    cartLock = useRef(false),
    mounted = useRef(true);
  const showToast = (message, type = "success") => {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 3500);
  };
  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const [data, catalog, settings] = await Promise.all([
        api("/products"),
        api("/categories"),
        api("/settings"),
      ]);
      setProducts(data.products);
      setCategories(catalog.categories);
      setStoreSettings(settings.settings);
      setFavorites((current) =>
        current.filter((id) => data.products.some((p) => p.id === id)),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function refreshNotifications() {
    const data = await api("/notifications");
    setNotifications(data.notifications);
  }
  async function updateProfile(form) {
    const data = await api("/account", { method: "PUT", body: form });
    setUser(data.user);
    return data.user;
  }
  useEffect(() => {
    mounted.current = true;
    loadProducts();
    api("/auth/me")
      .then((data) => {
        if (mounted.current) setUser(data.user);
      })
      .catch((e) => {
        if (mounted.current) setError(e.message);
      })
      .finally(() => {
        if (mounted.current) setAuthReady(true);
      });
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(guestKey, JSON.stringify(guest));
    } catch {
      /* Chế độ riêng tư có thể chặn lưu trữ; giỏ vẫn hoạt động trong phiên. */
    }
  }, [guest]);
  useEffect(() => {
    let live = true;
    if (!user) {
      setFavorites([]);
      setNotifications([]);
      setCart([]);
      return;
    }
    api("/cart")
      .then((d) => {
        if (live) setCart(d.items);
      })
      .catch((e) => {
        if (live) showToast(e.message, "error");
      });
    api("/notifications")
      .then((d) => {
        if (live) setNotifications(d.notifications);
      })
      .catch((e) => {
        if (live) showToast(e.message, "error");
      });
    api("/favorites")
      .then((d) => {
        if (live) setFavorites(d.products.map((p) => p.id));
      })
      .catch((e) => {
        if (live) showToast(e.message, "error");
      });
    return () => {
      live = false;
    };
  }, [user?.id]);
  const items = user
    ? cart
    : guest
        .map((i) => ({
          ...products.find((p) => p.id === i.id),
          quantity: i.quantity,
        }))
        .filter((i) => i.name);
  async function authenticate(mode, form) {
    const result = await api(`/auth/${mode}`, { method: "POST", body: form });
    let mergeError = "";
    if (guest.length) {
      try {
        await api("/cart/merge", { method: "POST", body: { items: guest } });
        setGuest([]);
      } catch (e) {
        mergeError = e.message;
      }
    }
    setUser(result.user);
    showToast(
      mergeError
        ? `Đã đăng nhập. Chưa chuyển được giỏ hàng: ${mergeError}`
        : mode === "register"
          ? "Tạo tài khoản thành công."
          : "Chào mừng bạn trở lại!",
      mergeError ? "error" : "success",
    );
    return result.user;
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setCart([]);
    setNotifications([]);
    setFavorites([]);
    showToast("Bạn đã đăng xuất.");
  }
  async function setQuantity(product, quantity) {
    if (!authReady || cartLock.current) return;
    if (quantity < 0 || quantity > 999) return;
    if (quantity > product.stock) {
      showToast(`Sản phẩm hiện còn ${product.stock} đơn vị.`, "error");
      return;
    }
    cartLock.current = true;
    setCartBusy(true);
    try {
      if (user) {
        const d = await api(`/cart/${product.id}`, {
          method: "PUT",
          body: { quantity },
        });
        setCart(d.items);
        await refreshNotifications();
      } else
        setGuest((current) =>
          quantity === 0
            ? current.filter((i) => i.id !== product.id)
            : [
                ...current.filter((i) => i.id !== product.id),
                { id: product.id, quantity },
              ],
        );
    } catch (e) {
      showToast(e.message, "error");
      throw e;
    } finally {
      cartLock.current = false;
      setCartBusy(false);
    }
  }
  async function addToCart(product) {
    if (!authReady || cartLock.current) return;
    const quantity =
      (items.find((i) => i.id === product.id)?.quantity || 0) + 1;
    if (quantity > product.stock) {
      showToast("Bạn đã chọn hết số lượng hiện có.", "error");
      return;
    }
    try {
      await setQuantity(product, quantity);
      showToast(`Đã thêm ${product.name.toLowerCase()} vào giỏ.`);
    } catch {
      /* Thông báo lỗi được xử lý trong setQuantity. */
    }
  }
  async function markRead() {
    try {
      await api("/notifications/read", { method: "PATCH" });
      setNotifications((current) => current.map((n) => ({ ...n, is_read: 1 })));
    } catch (e) {
      showToast(e.message, "error");
    }
  }
  async function refreshCart() {
    const data = await api("/cart");
    setCart(data.items);
  }
  async function toggleFavorite(product) {
    const data = await api(`/favorites/${product.id}`, {
      method: "PUT",
      body: { favorite: !favorites.includes(product.id) },
    });
    setFavorites(data.products.map((p) => p.id));
  }
  return (
    <Context.Provider
      value={{
        products,
        categories,
        storeSettings,
        updateProfile,
        user,
        authReady,
        loading,
        error,
        loadProducts,
        items,
        // Chờ xác định phiên đăng nhập để không lưu nhầm giỏ vào chế độ khách.
        cartBusy: cartBusy || !authReady,
        notifications,
        toast,
        setToast,
        showToast,
        authenticate,
        logout,
        addToCart,
        setQuantity,
        markRead,
        refreshNotifications,
        refreshCart,
        favorites,
        toggleFavorite,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useShop = () => useContext(Context);

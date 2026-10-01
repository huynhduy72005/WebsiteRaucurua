import { db } from "../database.js";
const defaults = {
  storeName: "Vườn Nhà",
  storeAddress: "",
  storePhone: "",
  bankName: process.env.BANK_NAME || "",
  bankAccount: process.env.BANK_ACCOUNT || "",
  bankHolder: process.env.BANK_HOLDER || "",
  shippingFee: 25000,
  freeShippingFrom: 300000,
};
db.prepare("INSERT OR IGNORE INTO shop_settings(id,value) VALUES(1,?)").run(
  JSON.stringify(defaults),
);
export function getSettings() {
  return {
    ...defaults,
    ...JSON.parse(
      db.prepare("SELECT value FROM shop_settings WHERE id=1").get().value,
    ),
  };
}
export function bankReady(settings = getSettings()) {
  return Boolean(
    settings.bankName && settings.bankAccount && settings.bankHolder,
  );
}
export function vnpayReady() {
  return Boolean(
    process.env.VNPAY_TMN_CODE &&
      process.env.VNPAY_HASH_SECRET &&
      process.env.VNPAY_RETURN_URL,
  );
}
export function publicSettings() {
  return {
    ...getSettings(),
    bankReady: bankReady(),
    vnpayReady: vnpayReady(),
    vnpaySandbox: !(process.env.VNPAY_URL || "").startsWith(
      "https://pay.vnpay.vn/",
    ),
  };
}
export function shippingFee(subtotal, settings = getSettings()) {
  return subtotal >= settings.freeShippingFrom ? 0 : settings.shippingFee;
}

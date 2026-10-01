import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID, createHmac } from "node:crypto";

test("Đặt hàng, hóa đơn, yêu thích và xác minh thanh toán", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "vuon-nha-commerce-"));
  process.env.DB_PATH = join(dir, "test.sqlite");
  const { db } = await import("../database.js");
  const { hashPassword } = await import("../security.js");
  const password = "TestPassword42!",
    hash = await hashPassword(password);
  const people = [
    ["Customer", "buyer@test.local", "customer"],
    ["Other Customer", "other@test.local", "customer"],
    ["Staff", "employee@test.local", "staff"],
    ["Manager", "owner@test.local", "manager"],
  ];
  for (const [name, email, role] of people)
    db.prepare(
      "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)",
    ).run(name, email, hash, role);
  const secret = "TEST_ONLY_NOT_A_REAL_MERCHANT_KEY";
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: "0",
      VNPAY_TMN_CODE: "TESTCODE",
      VNPAY_HASH_SECRET: secret,
      VNPAY_RETURN_URL: "http://localhost:5173/api/payments/vnpay/return",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null)
      await new Promise((resolve) => {
        child.once("exit", resolve);
        child.kill();
      });
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const origin = await new Promise((resolve, reject) => {
    let data = "";
    const timer = setTimeout(() => reject(new Error("Startup timeout")), 10000);
    child.stdout.on("data", (chunk) => {
      data += chunk;
      const match = data.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve("http://127.0.0.1:" + match[1]);
      }
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Server exit " + code));
    });
  });
  async function request(
    path,
    { cookie, body, method = "GET", redirect = "follow" } = {},
  ) {
    const response = await fetch(origin + "/api" + path, {
      method,
      redirect,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const content = response.headers.get("content-type");
    const data = content?.includes("application/json")
      ? await response.json()
      : Buffer.from(await response.arrayBuffer());
    return {
      status: response.status,
      data,
      location: response.headers.get("location"),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      content,
    };
  }
  const cookies = [];
  for (const [, email] of people)
    cookies.push(
      (
        await request("/auth/login", {
          method: "POST",
          body: { email, password },
        })
      ).cookie,
    );
  const [buyer, other, staff, manager] = cookies;
  async function cart(id = 1, quantity = 1) {
    return request(`/cart/${id}`, {
      method: "PUT",
      cookie: buyer,
      body: { quantity },
    });
  }
  async function checkout(method = "cod", extra = {}) {
    const items = (await request("/cart", { cookie: buyer })).data.items;
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const settings = (await request("/settings")).data.settings;
    const body = {
      recipient: "Nguyễn Văn An",
      phone: "0901234567",
      address: "123 Đường Nguyễn Huệ, Thành phố Hồ Chí Minh",
      note: "Gọi trước khi giao",
      paymentMethod: method,
      checkoutKey: randomUUID(),
      items: items.map((p) => ({
        id: p.id,
        price: p.price,
        quantity: p.quantity,
      })),
      expectedTotal:
        subtotal +
        (subtotal >= settings.freeShippingFrom ? 0 : settings.shippingFee),
      ...extra,
    };
    return {
      body,
      result: await request("/orders", { method: "POST", cookie: buyer, body }),
    };
  }
  const stock = () =>
    db.prepare("SELECT stock FROM products WHERE id=1").get().stock;
  let codOrder, bankOrder, onlineOrder;
  await t.test(
    "Yêu thích lưu lâu dài, riêng từng người và yêu cầu đăng nhập",
    async () => {
      assert.equal((await request("/favorites")).status, 401);
      assert.equal(
        (
          await request("/favorites/1", {
            method: "PUT",
            cookie: buyer,
            body: { favorite: true },
          })
        ).data.products.length,
        1,
      );
      assert.equal(
        (
          await request("/favorites/1", {
            method: "PUT",
            cookie: buyer,
            body: { favorite: true },
          })
        ).data.products.length,
        1,
      );
      assert.equal(
        (await request("/favorites", { cookie: other })).data.products.length,
        0,
      );
      assert.equal(
        (
          await request("/favorites/1", {
            method: "PUT",
            cookie: buyer,
            body: { favorite: false },
          })
        ).data.products.length,
        0,
      );
    },
  );
  await t.test(
    "Không chấp nhận giá/tổng tiền từ khách bị thay đổi",
    async () => {
      await cart(1, 2);
      const before = stock();
      const { body } = await checkout("cod", { expectedTotal: 1 });
      assert.equal(
        (await request("/orders", { method: "POST", cookie: buyer, body }))
          .status,
        409,
      );
      body.expectedTotal = 81000;
      body.items[0].price = 1;
      assert.equal(
        (await request("/orders", { method: "POST", cookie: buyer, body }))
          .status,
        409,
      );
      assert.equal(stock(), before);
      assert.equal(
        db.prepare("SELECT count(*) AS count FROM orders").get().count,
        0,
      );
    },
  );
  await t.test(
    "COD tính tiền ở máy chủ, trừ kho, xóa giỏ và chống tạo đơn trùng",
    async () => {
      const before = stock();
      const { body, result } = await checkout();
      assert.equal(result.status, 201);
      codOrder = result.data.order;
      assert.equal(codOrder.total, 81000);
      assert.equal(stock(), before - 2);
      assert.equal(
        (await request("/cart", { cookie: buyer })).data.items.length,
        0,
      );
      const retry = await request("/orders", {
        method: "POST",
        cookie: buyer,
        body,
      });
      assert.equal(retry.status, 200);
      assert.equal(retry.data.order.id, codOrder.id);
      assert.equal(stock(), before - 2);
      assert.equal(
        (
          await request("/orders", {
            method: "POST",
            cookie: buyer,
            body: { ...body, recipient: "Khách khác" },
          })
        ).status,
        409,
      );
    },
  );
  await t.test(
    "Chi tiết, danh sách, hóa đơn được giới hạn đúng người dùng",
    async () => {
      assert.equal(
        (await request(`/orders/${codOrder.id}`, { cookie: other })).status,
        404,
      );
      assert.equal(
        (await request(`/orders/${codOrder.id}/invoice`, { cookie: other }))
          .status,
        404,
      );
      assert.equal(
        (await request("/orders?scope=all", { cookie: other })).status,
        403,
      );
      assert.equal(
        (await request("/orders?scope=all", { cookie: staff })).data.orders
          .length,
        1,
      );
      const invoice = await request(`/orders/${codOrder.id}/invoice`, {
        cookie: buyer,
      });
      assert.equal(invoice.status, 200);
      assert.match(invoice.content, /application\/pdf/);
      assert.equal(invoice.data.subarray(0, 4).toString(), "%PDF");
    },
  );
  await t.test(
    "Hủy hoàn kho đúng một lần; giá đã đặt không đổi khi sửa giá sản phẩm",
    async () => {
      const before = stock();
      assert.equal(
        (
          await request(`/orders/${codOrder.id}/cancel`, {
            method: "POST",
            cookie: buyer,
          })
        ).status,
        200,
      );
      assert.equal(stock(), before + 2);
      assert.equal(
        (
          await request(`/orders/${codOrder.id}/cancel`, {
            method: "POST",
            cookie: buyer,
          })
        ).status,
        409,
      );
      assert.equal(stock(), before + 2);
      db.prepare("UPDATE products SET price=31000 WHERE id=1").run();
      const snapshot = (
        await request(`/orders/${codOrder.id}`, { cookie: buyer })
      ).data.order;
      assert.equal(snapshot.items[0].price, 28000);
      assert.equal(snapshot.total, 81000);
      db.prepare("UPDATE products SET price=28000 WHERE id=1").run();
    },
  );
  await t.test(
    "Thiếu kho ở món thứ hai hủy toàn bộ giao dịch, không mất hàng món đầu",
    async () => {
      await cart(1, 1);
      await cart(2, 1);
      const before = stock(),
        oldStock = db
          .prepare("SELECT stock FROM products WHERE id=2")
          .get().stock;
      db.prepare("UPDATE products SET stock=0 WHERE id=2").run();
      const result = await checkout();
      assert.equal(result.result.status, 409);
      assert.equal(stock(), before);
      assert.equal(
        db.prepare("SELECT count(*) AS count FROM orders").get().count,
        1,
      );
      assert.equal(
        (await request("/cart", { cookie: buyer })).data.items.length,
        2,
      );
      db.prepare("UPDATE products SET stock=? WHERE id=2").run(oldStock);
      await cart(2, 0);
    },
  );
  await t.test(
    "Trạng thái COD chuyển đúng trình tự và phải thu đủ tiền trước khi đã giao",
    async () => {
      const { result } = await checkout();
      const id = result.data.order.id;
      assert.equal(
        (
          await request(`/orders/${id}/status`, {
            method: "PATCH",
            cookie: buyer,
            body: { status: "confirmed" },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request(`/orders/${id}/status`, {
            method: "PATCH",
            cookie: staff,
            body: { status: "shipping" },
          })
        ).status,
        409,
      );
      for (const status of ["confirmed", "shipping"])
        assert.equal(
          (
            await request(`/orders/${id}/status`, {
              method: "PATCH",
              cookie: staff,
              body: { status },
            })
          ).status,
          200,
        );
      assert.equal(
        (
          await request(`/orders/${id}/status`, {
            method: "PATCH",
            cookie: staff,
            body: { status: "delivered" },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request(`/orders/${id}/confirm-payment`, {
            method: "POST",
            cookie: buyer,
            body: { reference: "COD đã thu" },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request(`/orders/${id}/confirm-payment`, {
            method: "POST",
            cookie: staff,
            body: { reference: "COD đã thu đủ tiền" },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request(`/orders/${id}/status`, {
            method: "PATCH",
            cookie: staff,
            body: { status: "delivered" },
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "Ngân hàng cần cấu hình quản lý; thông tin ngân hàng lưu theo đơn",
    async () => {
      await cart();
      assert.equal((await checkout("bank")).result.status, 409);
      const settings = (await request("/settings")).data.settings;
      const body = {
        ...settings,
        bankName: "Ngân hàng kiểm thử",
        bankAccount: "0000000000",
        bankHolder: "TAI KHOAN KIEM THU",
      };
      assert.equal(
        (await request("/settings", { method: "PUT", cookie: staff, body }))
          .status,
        403,
      );
      assert.equal(
        (await request("/settings", { method: "PUT", cookie: manager, body }))
          .status,
        200,
      );
      bankOrder = (await checkout("bank")).result.data.order;
      assert.equal(bankOrder.bank_snapshot.account, "0000000000");
      await request("/settings", {
        method: "PUT",
        cookie: manager,
        body: { ...body, bankAccount: "1111111111" },
      });
      assert.equal(
        (await request(`/orders/${bankOrder.id}`, { cookie: buyer })).data.order
          .bank_snapshot.account,
        "0000000000",
      );
      assert.equal(
        (
          await request(`/orders/${bankOrder.id}/status`, {
            method: "PATCH",
            cookie: staff,
            body: { status: "confirmed" },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request(`/orders/${bankOrder.id}/confirm-payment`, {
            method: "POST",
            cookie: manager,
            body: { reference: "TEST BANK TRANSFER 123" },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request(`/orders/${bankOrder.id}/cancel`, {
            method: "POST",
            cookie: buyer,
          })
        ).status,
        409,
      );
    },
  );
  function signed(params) {
    const data = Object.keys(params)
      .sort()
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`,
      )
      .join("&");
    return new URLSearchParams({
      ...params,
      vnp_SecureHash: createHmac("sha512", secret).update(data).digest("hex"),
    }).toString();
  }
  let payment, params;
  await t.test(
    "VNPay dùng đúng số tiền ×100, tham chiếu riêng và chữ ký URL",
    async () => {
      await cart();
      onlineOrder = (await checkout("vnpay")).result.data.order;
      payment = await request(`/payments/vnpay/${onlineOrder.id}`, {
        method: "POST",
        cookie: buyer,
      });
      assert.equal(payment.status, 200);
      const url = new URL(payment.data.url),
        query = Object.fromEntries(url.searchParams);
      assert.equal(url.hostname, "sandbox.vnpayment.vn");
      assert.equal(query.vnp_Amount, String(onlineOrder.total * 100));
      assert.equal(query.vnp_CurrCode, "VND");
      const hash = query.vnp_SecureHash;
      delete query.vnp_SecureHash;
      const encoded = Object.keys(query)
        .sort()
        .map(
          (key) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(query[key]).replace(/%20/g, "+")}`,
        )
        .join("&");
      assert.equal(
        hash,
        createHmac("sha512", secret).update(encoded).digest("hex"),
      );
      assert.equal(
        (
          await request(`/payments/vnpay/${onlineOrder.id}`, {
            method: "POST",
            cookie: buyer,
          })
        ).data.url,
        payment.data.url,
      );
      assert.equal(
        (
          await request(`/orders/${onlineOrder.id}/cancel`, {
            method: "POST",
            cookie: buyer,
          })
        ).status,
        409,
      );
      params = {
        vnp_TxnRef: url.searchParams.get("vnp_TxnRef"),
        vnp_TmnCode: "TESTCODE",
        vnp_Amount: String(onlineOrder.total * 100),
        vnp_ResponseCode: "00",
        vnp_TransactionStatus: "00",
        vnp_TransactionNo: "TESTTXN123",
      };
    },
  );
  await t.test(
    "Return URL không ghi nhận thanh toán; IPN từ chối chữ ký/số tiền giả",
    async () => {
      const ret = await request("/payments/vnpay/return?" + signed(params), {
        redirect: "manual",
      });
      assert.equal(ret.status, 302);
      assert.equal(
        (await request(`/orders/${onlineOrder.id}`, { cookie: buyer })).data
          .order.payment_status,
        "pending",
      );
      const badSignature = new URLSearchParams({
        ...params,
        vnp_SecureHash: "0".repeat(128),
      });
      assert.equal(
        (await request("/payments/vnpay/ipn?" + badSignature)).data.RspCode,
        "97",
      );
      assert.equal(
        (
          await request(
            "/payments/vnpay/ipn?" + signed({ ...params, vnp_Amount: "100" }),
          )
        ).data.RspCode,
        "04",
      );
      assert.equal(
        (
          await request(
            "/payments/vnpay/ipn?" +
              signed({ ...params, vnp_TmnCode: "OTHERCODE" }),
          )
        ).data.RspCode,
        "97",
      );
      assert.equal(
        (
          await request(`/orders/${onlineOrder.id}/confirm-payment`, {
            method: "POST",
            cookie: manager,
            body: { reference: "Fake paid" },
          })
        ).status,
        409,
      );
    },
  );
  await t.test(
    "IPN hợp lệ ghi nhận đúng một lần; thất bại cho phép thử lại",
    async () => {
      assert.equal(
        (await request("/payments/vnpay/ipn?" + signed(params))).data.RspCode,
        "00",
      );
      assert.equal(
        (await request("/payments/vnpay/ipn?" + signed(params))).data.RspCode,
        "02",
      );
      assert.equal(
        (await request(`/orders/${onlineOrder.id}`, { cookie: buyer })).data
          .order.payment_status,
        "paid",
      );
      assert.equal(
        (
          await request(`/orders/${onlineOrder.id}/cancel`, {
            method: "POST",
            cookie: buyer,
          })
        ).status,
        409,
      );
      await cart();
      const failed = (await checkout("vnpay")).result.data.order;
      const first = await request(`/payments/vnpay/${failed.id}`, {
        method: "POST",
        cookie: buyer,
      });
      const ref = new URL(first.data.url).searchParams.get("vnp_TxnRef");
      assert.equal(
        (
          await request(
            "/payments/vnpay/ipn?" +
              signed({
                ...params,
                vnp_TxnRef: ref,
                vnp_Amount: String(failed.total * 100),
                vnp_ResponseCode: "24",
                vnp_TransactionStatus: "02",
                vnp_TransactionNo: "0",
              }),
          )
        ).data.RspCode,
        "00",
      );
      assert.equal(
        (await request(`/orders/${failed.id}`, { cookie: buyer })).data.order
          .payment_status,
        "failed",
      );
      const retry = await request(`/payments/vnpay/${failed.id}`, {
        method: "POST",
        cookie: buyer,
      });
      assert.equal(retry.status, 200);
      assert.notEqual(
        new URL(retry.data.url).searchParams.get("vnp_TxnRef"),
        ref,
      );
    },
  );
});

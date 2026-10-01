import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

test("Admin: nâng cấp Database, quản lý sản phẩm và doanh thu", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "vuon-nha-admin-"));
  process.env.DB_PATH = join(dir, "test.sqlite");
  // Giả lập Database của bản cũ chưa có is_active/revision.
  const legacy = new DatabaseSync(process.env.DB_PATH);
  legacy.exec(`CREATE TABLE products(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,
    price INTEGER NOT NULL,unit TEXT NOT NULL,stock INTEGER NOT NULL,image TEXT NOT NULL,
    origin TEXT NOT NULL,tag TEXT NOT NULL,description TEXT NOT NULL);
    INSERT INTO products VALUES(1,'Cà chua cũ','rau',31000,'500g',66,'/images/tomato.jpg','Đà Lạt','','Dữ liệu đã lưu từ bản cũ');`);
  legacy.close();
  const { db } = await import("../database.js");
  const { hashPassword } = await import("../security.js");
  const password = "TestPassword42!",
    hash = await hashPassword(password);
  for (const role of ["customer", "staff", "manager"])
    db.prepare(
      "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)",
    ).run(role, `${role}@test.local`, hash, role);
  let child, origin;
  async function stop() {
    if (child && child.exitCode === null && child.signalCode === null)
      await new Promise((resolve) => {
        child.once("exit", resolve);
        child.kill();
      });
  }
  async function start() {
    child = spawn(process.execPath, ["server/index.js"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    origin = await new Promise((resolve, reject) => {
      let output = "",
        errors = "";
      const timer = setTimeout(
        () => reject(new Error("Startup timeout: " + errors)),
        10000,
      );
      child.stderr.on("data", (d) => {
        errors += d;
      });
      child.stdout.on("data", (d) => {
        output += d;
        const match = output.match(/http:\/\/localhost:(\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve("http://127.0.0.1:" + match[1]);
        }
      });
      child.once("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Server exit ${code}: ${errors}`));
      });
    });
  }
  t.after(async () => {
    await stop();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  await start();
  async function request(path, { method = "GET", cookie, body } = {}) {
    const res = await fetch(origin + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      cookie: res.headers.get("set-cookie")?.split(";")[0],
      data: res.headers.get("content-type")?.includes("application/json")
        ? await res.json()
        : Buffer.from(await res.arrayBuffer()),
    };
  }
  const cookies = {};
  for (const role of ["customer", "staff", "manager"])
    cookies[role] = (
      await request("/auth/login", {
        method: "POST",
        body: { email: `${role}@test.local`, password },
      })
    ).cookie;
  const manager = cookies.manager,
    buyer = cookies.customer,
    staff = cookies.staff;
  const input = {
    name: "Cải ngọt 'Đà Lạt'",
    category: "rau",
    price: 25000,
    unit: "500g",
    stock: 20,
    image: "/images/broccoli.jpg",
    origin: "Đà Lạt",
    tag: "Mới về",
    description: "Cải ngọt tươi, bảo quản trong ngăn mát tủ lạnh.",
  };
  let product, order;
  await t.test(
    "Nâng cấp bảng giữ dữ liệu cũ; chặn khách/nhân viên tạo, sửa toàn bộ, xóa và xem doanh thu",
    async () => {
      const old = db.prepare("SELECT * FROM products WHERE id=1").get();
      assert.equal(old.name, "Cà chua cũ");
      assert.equal(old.price, 31000);
      assert.equal(old.stock, 66);
      assert.equal(old.is_active, 1);
      assert.equal(old.revision, 0);
      assert.equal((await request("/products/manage")).status, 401);
      assert.equal(
        (await request("/products/manage", { cookie: buyer })).status,
        403,
      );
      for (const cookie of [undefined, buyer, staff]) {
        assert.equal(
          (await request("/products", { method: "POST", cookie, body: input }))
            .status,
          cookie ? 403 : 401,
        );
        assert.equal(
          (
            await request("/products/1", {
              method: "PUT",
              cookie,
              body: { ...input, expectedRevision: 0 },
            })
          ).status,
          cookie ? 403 : 401,
        );
        assert.equal(
          (
            await request("/products/1", {
              method: "DELETE",
              cookie,
              body: { expectedRevision: 0 },
            })
          ).status,
          cookie ? 403 : 401,
        );
        assert.equal(
          (
            await request("/admin/revenue?from=2026-10-01&to=2026-10-31", {
              cookie,
            })
          ).status,
          cookie ? 403 : 401,
        );
      }
    },
  );
  await t.test(
    "Kiểm tra trường nhập và ảnh; thêm sản phẩm ghi SQLite và hiện ở cửa hàng",
    async () => {
      for (const body of [
        null,
        { ...input, category: "invalid" },
        { ...input, price: 1.5 },
        { ...input, stock: -1 },
        { ...input, name: " " },
        { ...input, image: "javascript:alert(1)" },
        { ...input, image: "/images/../secret.jpg" },
      ])
        assert.equal(
          (
            await request("/products", {
              method: "POST",
              cookie: manager,
              body,
            })
          ).status,
          400,
        );
      const result = await request("/products", {
        method: "POST",
        cookie: manager,
        body: input,
      });
      assert.equal(result.status, 201);
      product = result.data.product;
      assert.equal(
        db.prepare("SELECT name FROM products WHERE id=?").get(product.id).name,
        input.name,
      );
      assert.equal(
        (await request("/products")).data.products.find(
          (p) => p.id === product.id,
        ).price,
        25000,
      );
    },
  );
  async function checkout(id, quantity = 1) {
    const cart = await request(`/cart/${id}`, {
      method: "PUT",
      cookie: buyer,
      body: { quantity },
    });
    assert.equal(cart.status, 200);
    const items = cart.data.items;
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const settings = (await request("/settings")).data.settings;
    return request("/orders", {
      method: "POST",
      cookie: buyer,
      body: {
        recipient: "Nguyễn Văn An",
        phone: "0901234567",
        address: "123 Đường Nguyễn Huệ, Hồ Chí Minh",
        paymentMethod: "cod",
        checkoutKey: randomUUID(),
        items: items.map((p) => ({
          id: p.id,
          price: p.price,
          quantity: p.quantity,
        })),
        expectedTotal:
          subtotal +
          (subtotal >= settings.freeShippingFrom ? 0 : settings.shippingFee),
      },
    });
  }
  await t.test(
    "Sửa đầy đủ thông tin; form cũ không ghi đè tồn kho sau đặt hàng",
    async () => {
      const saved = await request(`/products/${product.id}`, {
        method: "PUT",
        cookie: manager,
        body: {
          ...input,
          name: "Cải ngọt mới",
          price: 27000,
          expectedRevision: product.revision,
        },
      });
      assert.equal(saved.status, 200);
      product = saved.data.product;
      const result = await checkout(product.id, 2);
      assert.equal(result.status, 201);
      order = result.data.order;
      assert.equal(
        (
          await request(`/products/${product.id}`, {
            method: "PUT",
            cookie: manager,
            body: { ...input, expectedRevision: product.revision },
          })
        ).status,
        409,
      );
      assert.equal(
        db.prepare("SELECT stock FROM products WHERE id=?").get(product.id)
          .stock,
        18,
      );
      product = db.prepare("SELECT * FROM products WHERE id=?").get(product.id);
      const updated = await request(`/products/${product.id}`, {
        method: "PUT",
        cookie: manager,
        body: { ...product, price: 29000, expectedRevision: product.revision },
      });
      assert.equal(updated.status, 200);
      product = updated.data.product;
      assert.equal(
        (await request(`/orders/${order.id}`, { cookie: buyer })).data.order
          .items[0].price,
        27000,
      );
    },
  );
  await t.test(
    "Xóa ẩn sản phẩm, dọn giỏ/yêu thích, giữ đơn cũ và hóa đơn",
    async () => {
      await request(`/cart/${product.id}`, {
        method: "PUT",
        cookie: buyer,
        body: { quantity: 1 },
      });
      await request(`/favorites/${product.id}`, {
        method: "PUT",
        cookie: buyer,
        body: { favorite: true },
      });
      const result = await request(`/products/${product.id}`, {
        method: "DELETE",
        cookie: manager,
        body: { expectedRevision: product.revision },
      });
      assert.equal(result.status, 200);
      product = result.data.product;
      assert.equal(
        (await request("/products")).data.products.some(
          (p) => p.id === product.id,
        ),
        false,
      );
      assert.equal(
        (await request("/cart", { cookie: buyer })).data.items.length,
        0,
      );
      assert.equal(
        (await request("/favorites", { cookie: buyer })).data.products.length,
        0,
      );
      assert.equal(
        (
          await request(`/cart/${product.id}`, {
            method: "PUT",
            cookie: buyer,
            body: { quantity: 1 },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await request(`/favorites/${product.id}`, {
            method: "PUT",
            cookie: buyer,
            body: { favorite: true },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await request(`/products/${product.id}`, {
            method: "PATCH",
            cookie: staff,
            body: { price: 25000, stock: 10 },
          })
        ).status,
        404,
      );
      assert.equal(
        (await request(`/orders/${order.id}`, { cookie: buyer })).data.order
          .items[0].name,
        "Cải ngọt mới",
      );
      const pdf = await request(`/orders/${order.id}/invoice`, {
        cookie: buyer,
      });
      assert.equal(pdf.status, 200);
      assert.equal(pdf.data.subarray(0, 5).toString(), "%PDF-");
      const current = db.prepare("SELECT * FROM products WHERE id=1").get();
      assert.equal(
        (
          await request("/products/1", {
            method: "DELETE",
            cookie: manager,
            body: { expectedRevision: current.revision },
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "Khởi động lại giữ sản phẩm mới, trạng thái xóa và không nạp lại sản phẩm mẫu đã xóa",
    async () => {
      await stop();
      await start();
      const all = (await request("/products/manage", { cookie: manager })).data
        .products;
      assert.equal(all.find((p) => p.id === product.id).is_active, 0);
      assert.equal(all.find((p) => p.id === 1).is_active, 0);
      assert.equal(
        (await request("/products")).data.products.some((p) => p.id === 1),
        false,
      );
      const result = await request(`/products/${product.id}/restore`, {
        method: "POST",
        cookie: manager,
        body: { expectedRevision: product.revision },
      });
      assert.equal(result.status, 200);
      product = result.data.product;
      assert.equal(
        (await request("/products")).data.products.find(
          (p) => p.id === product.id,
        ).name,
        "Cải ngọt mới",
      );
    },
  );
  await t.test(
    "Doanh thu theo ngày nhận tiền ở Việt Nam, tách phí giao hàng, không đếm trùng mặt hàng",
    async () => {
      assert.equal(
        (
          await request(`/orders/${order.id}/confirm-payment`, {
            method: "POST",
            cookie: staff,
            body: { reference: "Đã thu COD" },
          })
        ).status,
        200,
      );
      db.prepare(
        "UPDATE orders SET paid_at='2026-09-30 18:00:00',created_at='2026-09-30 17:30:00' WHERE id=?",
      ).run(order.id);
      // Đơn khác có hai mặt hàng nhưng chưa trả tiền: không được cộng vào doanh thu.
      await request("/cart/2", {
        method: "PUT",
        cookie: buyer,
        body: { quantity: 1 },
      });
      const unpaid = await checkout(3, 2);
      assert.equal(unpaid.status, 201);
      db.prepare(
        "UPDATE orders SET created_at='2026-10-01 02:00:00' WHERE id=?",
      ).run(unpaid.data.order.id);
      const outside = await checkout(4, 1);
      assert.equal(outside.status, 201);
      await request(`/orders/${outside.data.order.id}/confirm-payment`, {
        method: "POST",
        cookie: staff,
        body: { reference: "Thu tiền khác kỳ" },
      });
      db.prepare(
        "UPDATE orders SET paid_at='2026-10-02 18:00:00',created_at='2026-10-03 01:00:00' WHERE id=?",
      ).run(outside.data.order.id);
      const cancelled = await checkout(5, 1);
      assert.equal(cancelled.status, 201);
      await request(`/orders/${cancelled.data.order.id}/cancel`, {
        method: "POST",
        cookie: buyer,
      });
      db.prepare(
        "UPDATE orders SET created_at='2026-10-01 03:00:00' WHERE id=?",
      ).run(cancelled.data.order.id);
      // Đơn đã trả tiền có hai mặt hàng: tổng đơn chỉ được tính một lần.
      await request("/cart/6", {
        method: "PUT",
        cookie: buyer,
        body: { quantity: 1 },
      });
      const multiItemPaid = await checkout(7, 2);
      assert.equal(multiItemPaid.status, 201);
      await request(`/orders/${multiItemPaid.data.order.id}/confirm-payment`, {
        method: "POST",
        cookie: staff,
        body: { reference: "Thu đủ tiền hai mặt hàng" },
      });
      db.prepare(
        "UPDATE orders SET paid_at='2026-10-01 10:00:00',created_at='2026-10-01 04:00:00' WHERE id=?",
      ).run(multiItemPaid.data.order.id);
      const result = await request(
        "/admin/revenue?from=2026-10-01&to=2026-10-02",
        { cookie: manager },
      );
      assert.equal(result.status, 200);
      const report = result.data.report;
      assert.equal(report.summary.productRevenue, 115000);
      assert.equal(report.summary.shippingCollected, 50000);
      assert.equal(report.summary.collectedTotal, 165000);
      assert.equal(report.summary.paidOrders, 2);
      assert.equal(report.summary.createdOrders, 4);
      assert.equal(report.summary.unpaidOrders, 1);
      assert.equal(report.summary.cancelledOrders, 1);
      assert.deepEqual(report.days, [
        { day: "2026-10-01", orders: 2, revenue: 115000 },
        { day: "2026-10-02", orders: 0, revenue: 0 },
      ]);
      assert.equal(report.topProducts[0].quantity, 2);
      assert.equal(report.topProducts[0].revenue, 54000);
      assert.equal(report.paymentMethods[0].collected, 165000);
      for (const query of [
        "from=2026-02-30&to=2026-03-01",
        "from=2026-10-03&to=2026-10-01",
        "from=2020-01-01&to=2026-10-01",
      ])
        assert.equal(
          (await request(`/admin/revenue?${query}`, { cookie: manager }))
            .status,
          400,
        );
      assert.equal(
        (
          await request("/admin/revenue?from=2000-01-01&to=2000-01-02", {
            cookie: manager,
          })
        ).data.report.summary.productRevenue,
        0,
      );
    },
  );
});

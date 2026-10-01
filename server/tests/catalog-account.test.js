import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

test("Danh mục động, hồ sơ, mật khẩu và liên hệ", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "vuon-nha-catalog-"));
  process.env.DB_PATH = join(dir, "test.sqlite");
  const legacy = new DatabaseSync(process.env.DB_PATH);
  legacy.exec(`CREATE TABLE products(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,
    price INTEGER NOT NULL,unit TEXT NOT NULL,stock INTEGER NOT NULL,image TEXT NOT NULL,
    origin TEXT NOT NULL,tag TEXT NOT NULL,description TEXT NOT NULL);
    INSERT INTO products VALUES(1,'Đậu khô cũ','do-kho',32000,'500g',20,'/images/potato.jpg','Việt Nam','','Thông tin từ Database cũ');`);
  legacy.close();
  const { db } = await import("../database.js"),
    { hashPassword } = await import("../security.js");
  const password = "TestPassword42!",
    hash = await hashPassword(password);
  for (const role of ["manager", "staff", "customer", "other"])
    db.prepare(
      "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)",
    ).run(
      role,
      `${role}@test.local`,
      hash,
      role === "other" ? "customer" : role,
    );
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
      let out = "",
        err = "";
      const timer = setTimeout(
        () => reject(new Error("Startup timeout: " + err)),
        10000,
      );
      child.stderr.on("data", (d) => {
        err += d;
      });
      child.stdout.on("data", (d) => {
        out += d;
        const match = out.match(/http:\/\/localhost:(\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve("http://127.0.0.1:" + match[1]);
        }
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Server exit ${code}: ${err}`));
      });
      child.once("error", (e) => {
        clearTimeout(timer);
        reject(e);
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
    const response = await fetch(origin + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }
  const cookies = {};
  for (const role of ["manager", "staff", "customer", "other"])
    cookies[role] = (
      await request("/auth/login", {
        method: "POST",
        body: { email: `${role}@test.local`, password },
      })
    ).cookie;
  const manager = cookies.manager,
    staff = cookies.staff,
    other = cookies.other;
  let buyer = cookies.customer,
    category,
    product,
    ticket;
  await t.test(
    "Nâng cấp giữ nhóm riêng của Database cũ; API danh mục chỉ quản lý được ghi",
    async () => {
      assert.ok(
        (await request("/categories")).data.categories.some(
          (c) => c.id === "do-kho",
        ),
      );
      assert.equal(
        db.prepare("SELECT name FROM products WHERE id=1").get().name,
        "Đậu khô cũ",
      );
      for (const cookie of [undefined, buyer, staff]) {
        assert.equal(
          (
            await request("/categories", {
              method: "POST",
              cookie,
              body: { name: "Nhóm mới" },
            })
          ).status,
          cookie ? 403 : 401,
        );
        assert.equal(
          (
            await request("/categories/rau", {
              method: "DELETE",
              cookie,
              body: { expectedRevision: 0 },
            })
          ).status,
          cookie ? 403 : 401,
        );
      }
    },
  );
  await t.test(
    "Thêm/sửa danh mục và sản phẩm trong nhóm mới; ngăn xóa nhóm có cả sản phẩm đã ẩn",
    async () => {
      const created = await request("/categories", {
        method: "POST",
        cookie: manager,
        body: {
          name: "Rau gia vị",
          description: "Cho món ăn thơm ngon",
          sort_order: 4,
        },
      });
      assert.equal(created.status, 201);
      category = created.data.category;
      assert.equal(category.id, "rau-gia-vi");
      assert.equal(
        (
          await request("/categories", {
            method: "POST",
            cookie: manager,
            body: { name: "RAU GIA VỊ" },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request("/categories", {
            method: "POST",
            cookie: manager,
            body: { name: " ", sort_order: 1.5 },
          })
        ).status,
        400,
      );
      const updated = await request(`/categories/${category.id}`, {
        method: "PUT",
        cookie: manager,
        body: {
          ...category,
          name: "Rau thơm",
          expectedRevision: category.revision,
        },
      });
      assert.equal(updated.status, 200);
      category = updated.data.category;
      assert.equal(category.id, "rau-gia-vi");
      assert.equal(category.name, "Rau thơm");
      const source = db.prepare("SELECT * FROM products WHERE id=2").get();
      const added = await request("/products", {
        method: "POST",
        cookie: manager,
        body: { ...source, name: "Húng quế", category: category.id },
      });
      assert.equal(added.status, 201);
      product = added.data.product;
      assert.equal(
        (await request("/categories")).data.categories.find(
          (c) => c.id === category.id,
        ).productCount,
        1,
      );
      assert.equal(
        (
          await request(`/categories/${category.id}`, {
            method: "DELETE",
            cookie: manager,
            body: { expectedRevision: category.revision },
          })
        ).status,
        409,
      );
      product = (
        await request(`/products/${product.id}`, {
          method: "DELETE",
          cookie: manager,
          body: { expectedRevision: product.revision },
        })
      ).data.product;
      assert.equal(
        (
          await request(`/categories/${category.id}`, {
            method: "DELETE",
            cookie: manager,
            body: { expectedRevision: category.revision },
          })
        ).status,
        409,
      );
      assert.throws(() =>
        db.prepare("DELETE FROM categories WHERE id=?").run(category.id),
      );
      assert.equal(
        (
          await request("/products", {
            method: "POST",
            cookie: manager,
            body: { ...source, category: "does-not-exist" },
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "Xóa nhóm rỗng; khởi động lại không tạo lại nhóm mặc định đã xóa",
    async () => {
      for (const p of db
        .prepare("SELECT * FROM products WHERE category='qua'")
        .all())
        assert.equal(
          (
            await request(`/products/${p.id}`, {
              method: "PUT",
              cookie: manager,
              body: { ...p, category: "rau", expectedRevision: p.revision },
            })
          ).status,
          200,
        );
      assert.equal(
        (
          await request("/categories/qua", {
            method: "DELETE",
            cookie: manager,
            body: { expectedRevision: 0 },
          })
        ).status,
        200,
      );
      await stop();
      await start();
      const categories = (await request("/categories")).data.categories;
      assert.equal(
        categories.some((c) => c.id === "qua"),
        false,
      );
      assert.equal(
        categories.find((c) => c.id === category.id).name,
        "Rau thơm",
      );
      assert.equal(
        db.prepare("SELECT is_active FROM products WHERE id=?").get(product.id)
          .is_active,
        0,
      );
    },
  );
  await t.test(
    "Hồ sơ lưu riêng từng người; không tự đổi email, quyền hay tài khoản khác",
    async () => {
      const customer = db
        .prepare("SELECT id FROM users WHERE email='customer@test.local'")
        .get();
      const another = db
        .prepare("SELECT id FROM users WHERE email='other@test.local'")
        .get();
      const result = await request("/account", {
        method: "PUT",
        cookie: buyer,
        body: {
          name: "Nguyễn Văn An",
          phone: "0901234567",
          address: "123 Nguyễn Huệ, Hồ Chí Minh",
          id: another.id,
          email: "changed@test.local",
          role: "manager",
        },
      });
      assert.equal(result.status, 200);
      assert.equal(result.data.user.id, customer.id);
      assert.equal(result.data.user.role, "customer");
      assert.equal(result.data.user.email, "customer@test.local");
      assert.equal(
        (await request("/account", { cookie: buyer })).data.user.phone,
        "0901234567",
      );
      assert.equal(
        (await request("/account", { cookie: other })).data.user.name,
        "other",
      );
      assert.equal((await request("/account")).status, 401);
      assert.equal(
        (
          await request("/account", {
            method: "PUT",
            cookie: buyer,
            body: { name: "Nguyễn An", phone: "invalid", address: "" },
          })
        ).status,
        400,
      );
      assert.equal(
        (await request(`/users/${customer.id}`, { cookie: buyer })).status,
        403,
      );
      assert.equal(
        (await request(`/users/${customer.id}`, { cookie: staff })).status,
        403,
      );
      const detail = (
        await request(`/users/${customer.id}`, { cookie: manager })
      ).data;
      assert.equal(detail.user.address, "123 Nguyễn Huệ, Hồ Chí Minh");
      assert.equal(detail.user.password_hash, undefined);
      assert.equal(detail.user.token_hash, undefined);
      assert.equal(detail.summary.orderCount, 0);
      assert.ok(
        (await request("/users", { cookie: manager })).data.users.every(
          (u) => u.password_hash === undefined,
        ),
      );
    },
  );
  await t.test(
    "Đổi mật khẩu kiểm tra mật khẩu cũ và kết thúc các phiên cũ",
    async () => {
      const second = (
        await request("/auth/login", {
          method: "POST",
          body: { email: "customer@test.local", password },
        })
      ).cookie;
      assert.equal(
        (
          await request("/account/password", {
            method: "POST",
            cookie: buyer,
            body: {
              currentPassword: "WrongPassword42!",
              newPassword: "NewPassword42!",
            },
          })
        ).status,
        400,
      );
      const changed = await request("/account/password", {
        method: "POST",
        cookie: buyer,
        body: { currentPassword: password, newPassword: "NewPassword42!" },
      });
      assert.equal(changed.status, 200);
      assert.equal((await request("/account", { cookie: buyer })).status, 401);
      assert.equal((await request("/account", { cookie: second })).status, 401);
      buyer = changed.cookie;
      assert.equal((await request("/account", { cookie: buyer })).status, 200);
      assert.equal(
        (
          await request("/auth/login", {
            method: "POST",
            body: { email: "customer@test.local", password },
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await request("/auth/login", {
            method: "POST",
            body: { email: "customer@test.local", password: "NewPassword42!" },
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "Liên hệ lưu Database, phản hồi riêng từng khách và tạo thông báo",
    async () => {
      const body = {
        name: "Nguyễn Văn An",
        email: "customer@test.local",
        phone: "0901234567",
        message: "Tôi muốn hỏi về đơn hàng và thời gian giao hàng.",
      };
      const result = await request("/inquiries", {
        method: "POST",
        cookie: buyer,
        body,
      });
      assert.equal(result.status, 201);
      ticket = result.data.id;
      assert.equal(
        db.prepare("SELECT message FROM inquiries WHERE id=?").get(ticket)
          .message,
        body.message,
      );
      assert.equal(
        (await request("/inquiries", { cookie: other })).data.inquiries.length,
        0,
      );
      assert.equal(
        (await request("/inquiries?scope=all", { cookie: buyer })).status,
        403,
      );
      assert.equal(
        (
          await request(`/inquiries/${ticket}`, {
            method: "PATCH",
            cookie: buyer,
            body: { status: "resolved", reply: "Giả phản hồi" },
          })
        ).status,
        403,
      );
      const updated = await request(`/inquiries/${ticket}`, {
        method: "PATCH",
        cookie: staff,
        body: {
          status: "resolved",
          reply: "Bạn vui lòng cung cấp mã đơn để cửa hàng kiểm tra.",
        },
      });
      assert.equal(updated.status, 200);
      assert.equal(
        (await request("/inquiries", { cookie: buyer })).data.inquiries[0]
          .reply,
        updated.data.inquiry.reply,
      );
      assert.ok(
        (
          await request("/notifications", { cookie: buyer })
        ).data.notifications.some((n) => n.title === "Cửa hàng đã phản hồi"),
      );
      assert.equal(
        (
          await request("/inquiries", {
            method: "POST",
            body: { ...body, message: "short" },
          })
        ).status,
        400,
      );
      assert.equal(
        (await request("/inquiries", { method: "POST", body })).status,
        201,
      );
      assert.equal(
        (await request("/inquiries?scope=all", { cookie: manager })).data
          .inquiries.length,
        2,
      );
      await stop();
      await start();
      assert.equal(
        (await request("/inquiries", { cookie: buyer })).data.inquiries[0]
          .status,
        "resolved",
      );
      assert.equal(
        (await request("/account", { cookie: buyer })).data.user.phone,
        "0901234567",
      );
    },
  );
});

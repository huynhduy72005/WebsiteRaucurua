import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

test("Tài khoản, phiên đăng nhập, phân quyền và dữ liệu riêng của mỗi khách", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "vuon-nha-test-"));
  process.env.DB_PATH = join(dir, "test.sqlite");
  const { db } = await import("../database.js");
  const { hashPassword } = await import("../security.js");
  const password = "LocalTestPassword42!";
  const hash = await hashPassword(password);
  const managerId = Number(
    db
      .prepare(
        "INSERT INTO users(name,email,password_hash,role) VALUES('Manager','manager@test.local',?,'manager')",
      )
      .run(hash).lastInsertRowid,
  );
  db.prepare(
    "INSERT INTO users(name,email,password_hash,role) VALUES('Staff','staff@test.local',?,'staff')",
  ).run(hash);
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: "0", WEB_ORIGIN: "http://localhost:5180/" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null) {
      await new Promise((resolve) => {
        child.once("exit", resolve);
        child.kill();
      });
    }
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const origin = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Server startup timed out")),
      10000,
    );
    let buffer = "";
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const match = buffer.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited: ${code}`));
    });
  });
  async function request(
    path,
    { method = "GET", body, cookie, headers = {} } = {},
  ) {
    const response = await fetch(origin + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      setCookie: response.headers.get("set-cookie"),
    };
  }
  let customer, customer2, manager, staff;
  await t.test(
    "Đăng ký luôn tạo khách hàng, mật khẩu được băm và cookie HttpOnly",
    async () => {
      customer = await request("/auth/register", {
        method: "POST",
        body: {
          name: "Khách Một",
          email: "one@test.local",
          password,
          role: "manager",
        },
      });
      assert.equal(customer.status, 201);
      assert.equal(customer.data.user.role, "customer");
      assert.equal(customer.data.user.password_hash, undefined);
      assert.match(customer.setCookie, /HttpOnly/);
      assert.match(customer.setCookie, /SameSite=Lax/);
      assert.notEqual(
        db
          .prepare("SELECT password_hash FROM users WHERE email=?")
          .get("one@test.local").password_hash,
        password,
      );
      assert.equal(
        (await request("/auth/me", { cookie: customer.cookie })).data.user.name,
        "Khách Một",
      );
      assert.equal(
        (
          await request("/auth/register", {
            method: "POST",
            body: { name: "Khách Một", email: "one@test.local", password },
          })
        ).status,
        409,
      );
    },
  );
  await t.test(
    "Giới hạn thông tin đăng ký và chặn nguồn yêu cầu khác",
    async () => {
      // Địa chỉ đã cấu hình với dấu / cuối phải vượt qua kiểm tra nguồn.
      assert.equal(
        (
          await request("/auth/login", {
            method: "POST",
            headers: { Origin: "http://localhost:5180" },
            body: { email: "staff@test.local", password: "WrongPassword42" },
          })
        ).status,
        401,
      );
      // Một cổng khác chưa được cấu hình vẫn phải bị chặn.
      assert.equal(
        (
          await request("/auth/login", {
            method: "POST",
            headers: { Origin: "http://localhost:5181" },
            body: { email: "staff@test.local", password: "WrongPassword42" },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request("/auth/register", {
            method: "POST",
            body: { name: "", email: "bad", password: "123" },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/auth/logout", {
            method: "POST",
            cookie: customer.cookie,
            headers: { Origin: "https://evil.example" },
          })
        ).status,
        403,
      );
    },
  );
  await t.test(
    "Sản phẩm công khai; khách và người chưa đăng nhập không sửa được giá",
    async () => {
      const result = await request("/products");
      assert.equal(result.data.products.length, 8);
      assert.equal(
        (
          await request("/products/1", {
            method: "PATCH",
            body: { price: 30000, stock: 10 },
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await request("/products/1", {
            method: "PATCH",
            cookie: customer.cookie,
            body: { price: 30000, stock: 10 },
          })
        ).status,
        403,
      );
      assert.equal(
        (await request("/users", { cookie: customer.cookie })).status,
        403,
      );
    },
  );
  await t.test(
    "Mật khẩu sai bị từ chối; nhân viên sửa kho nhưng không đọc tài khoản",
    async () => {
      assert.equal(
        (
          await request("/auth/login", {
            method: "POST",
            body: { email: "staff@test.local", password: "WrongPassword42" },
          })
        ).status,
        401,
      );
      staff = await request("/auth/login", {
        method: "POST",
        body: { email: "staff@test.local", password },
      });
      assert.equal(staff.status, 200);
      assert.equal(
        (
          await request("/products/1", {
            method: "PATCH",
            cookie: staff.cookie,
            body: { price: 30000, stock: 10 },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request("/products/1", {
            method: "PATCH",
            cookie: staff.cookie,
            body: { price: -1, stock: 10 },
          })
        ).status,
        400,
      );
      assert.equal(
        (await request("/users", { cookie: staff.cookie })).status,
        403,
      );
    },
  );
  await t.test(
    "Giỏ hàng lưu theo tài khoản, kiểm tra tồn kho, thêm/sửa/xóa và gộp giỏ",
    async () => {
      assert.equal((await request("/cart")).status, 401);
      assert.equal(
        (
          await request("/cart/1", {
            method: "PUT",
            cookie: customer.cookie,
            body: { quantity: 2 },
          })
        ).data.items[0].quantity,
        2,
      );
      assert.equal(
        (
          await request("/cart/1", {
            method: "PUT",
            cookie: customer.cookie,
            body: { quantity: 11 },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request("/cart/1", {
            method: "PUT",
            cookie: customer.cookie,
            body: { quantity: 1.5 },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/cart/merge", {
            method: "POST",
            cookie: customer.cookie,
            body: { items: [{ id: 1, quantity: 3 }] },
          })
        ).data.items[0].quantity,
        5,
      );
      customer2 = await request("/auth/register", {
        method: "POST",
        body: { name: "Khách Hai", email: "two@test.local", password },
      });
      assert.deepEqual(
        (await request("/cart", { cookie: customer2.cookie })).data.items,
        [],
      );
      assert.equal(
        (
          await request("/cart/1", {
            method: "PUT",
            cookie: customer.cookie,
            body: { quantity: 0 },
          })
        ).data.items.length,
        0,
      );
    },
  );
  await t.test(
    "Thông báo riêng và đánh dấu đã đọc không ảnh hưởng khách khác",
    async () => {
      const one = await request("/notifications", { cookie: customer.cookie });
      assert.equal(one.data.notifications.length, 2);
      const two = await request("/notifications", { cookie: customer2.cookie });
      assert.equal(two.data.notifications.length, 1);
      assert.equal(two.data.notifications[0].user_id, customer2.data.user.id);
      await request("/notifications/read", {
        method: "PATCH",
        cookie: customer.cookie,
      });
      assert.ok(
        (
          await request("/notifications", { cookie: customer.cookie })
        ).data.notifications.every((n) => n.is_read === 1),
      );
      assert.equal(
        (await request("/notifications", { cookie: customer2.cookie })).data
          .notifications[0].is_read,
        0,
      );
    },
  );
  await t.test(
    "Chỉ quản lý cấp quyền, không tự hạ quyền; quyền được kiểm tra lại mỗi yêu cầu",
    async () => {
      manager = await request("/auth/login", {
        method: "POST",
        body: { email: "manager@test.local", password },
      });
      assert.equal(
        (await request("/users", { cookie: manager.cookie })).status,
        200,
      );
      assert.equal(
        (
          await request(`/users/${managerId}/role`, {
            method: "PATCH",
            cookie: manager.cookie,
            body: { role: "customer" },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request(`/users/${customer.data.user.id}/role`, {
            method: "PATCH",
            cookie: manager.cookie,
            body: { role: "staff" },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request("/products/1", {
            method: "PATCH",
            cookie: customer.cookie,
            body: { price: 30000, stock: 10 },
          })
        ).status,
        200,
      );
    },
  );
  await t.test("Đăng xuất vô hiệu hóa phiên trên máy chủ", async () => {
    assert.equal(
      (
        await request("/auth/logout", {
          method: "POST",
          cookie: customer.cookie,
        })
      ).status,
      200,
    );
    assert.equal(
      (await request("/auth/me", { cookie: customer.cookie })).data.user,
      null,
    );
    assert.equal(
      (await request("/cart", { cookie: customer.cookie })).status,
      401,
    );
  });
});

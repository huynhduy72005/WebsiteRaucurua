# Admin và lưu sản phẩm vào Database

## Mở trang Admin

1. Chạy `npm install`, sau đó `npm run dev` tại thư mục chứa `package.json`.
2. Nếu chưa có quản lý, mở terminal thứ hai, chạy `npm run create-manager`, nhập thông tin tài khoản của bạn.
3. Đăng nhập tài khoản quản lý, chọn **Tài khoản → Trang Admin** hoặc mở `http://localhost:5173/quan-ly` (đổi cổng nếu `.env` của bạn dùng cổng khác).

| Mục                    | Chức năng                                                                            | Ai có quyền?       |
| ---------------------- | ------------------------------------------------------------------------------------ | ------------------ |
| Tổng quan & doanh thu  | Lọc ngày, doanh thu, tiền đã thu, đơn hàng, biểu đồ, sản phẩm bán chạy, kho, tải CSV | Quản lý            |
| Sản phẩm               | Tìm kiếm, lọc danh mục/trạng thái, thêm/sửa toàn bộ, xóa/khôi phục                   | Quản lý            |
| Danh mục sản phẩm      | Thêm, đổi tên, sửa mô tả/thứ tự và xóa danh mục rỗng                                 | Quản lý            |
| Giá và tồn kho         | Cập nhật giá và số lượng còn bán                                                     | Nhân viên, quản lý |
| Đơn hàng               | Xem đơn, xác nhận tiền COD/chuyển khoản, cập nhật giao hàng, tải hóa đơn             | Nhân viên, quản lý |
| Liên hệ & hỗ trợ       | Xem yêu cầu, lưu phản hồi và cập nhật trạng thái xử lý                               | Nhân viên, quản lý |
| Tài khoản & phân quyền | Xem hồ sơ và cấp quyền nhân viên/quản lý cho tài khoản đã đăng ký                    | Quản lý            |
| Cửa hàng & thanh toán  | Sửa thông tin cửa hàng, ngân hàng và phí giao hàng                                   | Quản lý            |

Khách hàng không được gọi API quản trị. Quyền được kiểm tra tại máy chủ cho mỗi yêu cầu.

## Thêm sản phẩm

Vào **Sản phẩm → Thêm sản phẩm**, nhập thông tin rồi bấm **Lưu sản phẩm**.

- **Giá bán:** giá cho một đơn vị bán, ví dụ 25.000đ / 500g.
- **Tồn kho:** số đơn vị bán. Ví dụ tồn kho 20 với đơn vị 500g nghĩa là có 20 phần 500g.
- **Nhãn:** có thể để trống, hoặc nhập “Mới về”, “Theo mùa”.
- **Ảnh:** chép `cai-bo-xoi.jpg` vào `public/images`, rồi nhập `/images/cai-bo-xoi.jpg`. Nên đặt tên ảnh không dấu, không khoảng trắng. Có thể dùng URL HTTPS của ảnh. Form có xem trước và báo nếu không tải được ảnh. Bản này chưa có nút tải ảnh lên máy chủ.
- **Xuất xứ và mô tả:** hiển thị trong trang chi tiết sản phẩm.

Sau khi lưu, sản phẩm có trên trang bán hàng. Trình duyệt khách đang mở từ trước cần tải lại trang để đọc dữ liệu mới.

## Bấm Lưu thì dữ liệu đi đâu?

1. React lấy thông tin từ biểu mẫu `src/features/admin/ProductForm.jsx`.
2. Giao diện gửi JSON đến `POST /api/products`. Khi sửa, gửi đến `PUT /api/products/:id`.
3. `server/routes/products.js` kiểm tra bạn có quyền quản lý; `server/services/product-validation.js` kiểm tra dữ liệu nhập.
4. Máy chủ chạy `INSERT` hoặc `UPDATE` trong SQLite, trả sản phẩm đã lưu. Giao diện đọc lại danh sách để hiển thị.

Câu lệnh thêm sản phẩm trong code:

```sql
INSERT INTO products
  (name, category, price, unit, stock, image, origin, tag, description)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
```

Các dấu `?` được truyền giá trị riêng bằng `.run(...)`, tránh ghép dữ liệu người nhập vào SQL. `id` do Database tạo. Giá, tồn kho và thông tin sản phẩm đều lưu trong bảng `products`; `image` lưu đường dẫn đến file ảnh, không chứa file ảnh.

Database mặc định là **`server/data/shop.sqlite`**. Không cần cài MySQL. Cả tài khoản, giỏ hàng, yêu thích, đơn hàng và thông báo cũng lưu trong Database này. Dữ liệu vẫn còn khi dừng và chạy lại website; `.env` có thể đổi nơi lưu bằng `DB_PATH`.

## Sửa, xóa và khôi phục

- Bấm **Sửa**, thay đổi thông tin và lưu. Nếu có người sửa hoặc khách đặt hàng trong lúc bạn đang mở form, máy chủ báo dữ liệu đã thay đổi. Bấm Hủy, Tải lại rồi mở form Sửa để lấy tồn kho mới trước khi lưu.
- Bấm **Xóa**, xác nhận: sản phẩm bị ẩn khỏi cửa hàng và được bỏ khỏi giỏ/yêu thích. Database giữ bản ghi với `is_active = 0`; đơn hàng và hóa đơn cũ được giữ nguyên.
- Chọn bộ lọc **Đã xóa**, bấm **Khôi phục** để bán lại. Số lượng/giá vẫn giữ nguyên; bạn có thể sửa trước khi khôi phục.
- Giá, tên và quy cách trên đơn cũ là thông tin chụp tại thời điểm đặt, không đổi theo sản phẩm hiện tại.

`server/products.js` chỉ chứa 8 sản phẩm mẫu. Sản phẩm tạo từ Admin nằm trong Database. Không cần ghi thêm vào file mẫu. Máy chủ nạp mẫu một lần trong `server/migrations/catalog.js` và ghi dấu vào bảng `app_migrations`, nên khởi động lại không ghi đè sản phẩm đã sửa, khôi phục sản phẩm đã xóa hay tạo lại danh mục rỗng đã xóa.

## Báo cáo doanh thu

Vào **Tổng quan & doanh thu**, chọn từ ngày/đến ngày rồi bấm **Xem báo cáo**. Khoảng lọc tối đa 366 ngày, tính theo giờ Việt Nam.

- **Doanh thu hàng hóa:** tổng tiền sản phẩm của đơn đã xác nhận thanh toán trong kỳ; bỏ đơn đã hủy, không gồm phí giao hàng.
- **Tổng tiền đã thu:** doanh thu hàng hóa cộng phí giao hàng đã thu.
- **Đơn đã thanh toán:** theo ngày nhận tiền (`paid_at`).
- **Đơn tạo trong kỳ:** theo ngày khách đặt đơn (`created_at`). Chưa thanh toán/đã hủy là trạng thái hiện tại của các đơn đó.
- **Kho hiện tại:** tồn kho lúc mở báo cáo, không phải tồn kho tại ngày quá khứ đã chọn.
- **CSV:** bảng doanh thu từng ngày, mở được bằng Excel. Có cả ngày doanh thu bằng 0.

COD/chuyển khoản chỉ tính sau khi nhân viên/quản lý xác nhận đã nhận tiền. VNPay tính sau callback đã xác minh. Bấm đặt hàng chưa làm tăng doanh thu. Chưa có giá vốn, chi phí hoặc hoàn tiền nên báo cáo này chưa tính lợi nhuận.

## Giữ dữ liệu khi cập nhật code

**Giữ nguyên `.env` và `server/data` khi chép bản code mới.** Khi chạy, `server/database.js` tự thêm cột/bảng còn thiếu vào Database cũ, không xóa dữ liệu.

Sao lưu trên máy cá nhân: dừng máy chủ, sao chép toàn bộ thư mục `server/data` và ảnh tự thêm trong `public/images` sang nơi khác. Nếu `DB_PATH` trỏ sang thư mục khác, sao lưu thư mục chứa file đó. Dừng máy chủ trước khi sao chép để giữ bản sao SQLite nhất quán, kể cả các file WAL/SHM nếu còn tồn tại.

Nếu đưa website lên máy chủ, Database phải nằm ở nơi lưu bền vững và được sao lưu. Một bản sao code mới không tự mang theo dữ liệu trên máy cũ.

## Các file tách riêng để dễ đọc

| File                                      | Vai trò                                                              |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `src/features/admin/AdminPage.jsx`        | Khung Admin, các tab và kiểm tra vai trò trên giao diện              |
| `src/features/admin/ProductManager.jsx`   | Danh sách, tìm kiếm, thêm/sửa/xóa/khôi phục                          |
| `src/features/admin/ProductForm.jsx`      | Biểu mẫu nhập và gọi API lưu                                         |
| `src/features/admin/StockRow.jsx`         | Biểu mẫu giá/tồn kho cho nhân viên                                   |
| `src/features/admin/RevenueDashboard.jsx` | Thống kê, biểu đồ và xuất CSV                                        |
| `src/features/admin/AccountsManager.jsx`  | Tìm kiếm, xem hồ sơ và đổi quyền tài khoản                           |
| `src/features/admin/UserDetail.jsx`       | Hồ sơ an toàn, thông tin liên hệ và đơn hàng gần đây                 |
| `src/features/admin/CategoryManager.jsx`  | Biểu mẫu và danh sách danh mục sản phẩm                              |
| `src/features/admin/InquiryManager.jsx`   | Danh sách liên hệ, phản hồi và trạng thái xử lý                      |
| `src/features/admin/StoreSettings.jsx`    | Cài đặt cửa hàng/thanh toán                                          |
| `src/features/admin/admin.css`            | Giao diện Admin, có bố cục điện thoại                                |
| `server/routes/products.js`               | API CRUD, phân quyền và lưu SQLite                                   |
| `server/routes/categories.js`             | API danh mục và kiểm tra sản phẩm tham chiếu                         |
| `server/routes/users.js`                  | Hồ sơ khách/nhân viên và phân quyền quản lý                          |
| `server/routes/inquiries.js`              | API liên hệ và phản hồi có kiểm tra quyền                            |
| `server/services/product-validation.js`   | Kiểm tra dữ liệu sản phẩm                                            |
| `server/routes/admin.js`                  | API báo cáo cho quản lý                                              |
| `server/services/revenue.js`              | SQL tổng hợp doanh thu                                               |
| `server/database.js`                      | Tạo/nâng cấp Database và nạp mẫu                                     |
| `server/tests/admin.test.js`              | Kiểm tra quyền, lưu dữ liệu, khởi động lại, lịch sử đơn và doanh thu |

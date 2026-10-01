HEAD
# WebsiteRaucurua
# Vườn Nhà — website bán rau củ quả

React + Vite cho giao diện; Node.js + Express + SQLite cho tài khoản, phân quyền, giỏ hàng, đơn hàng, thanh toán, yêu thích, thông báo, danh mục động, hồ sơ tài khoản, liên hệ và trang Admin. PDFKit xuất hóa đơn với font tiếng Việt đi kèm.

## 1. Đưa code vào thư mục trong ảnh của bạn

Ảnh cho thấy `WebsiteRauCuQua/Raucuqua`. Đây là bộ code độc lập cùng cấu trúc Vite, không phải bản đọc được từ máy tính của bạn.

1. Giải nén file ZIP. Bên trong có thư mục `Raucuqua`.
2. Sao lưu thư mục `Raucuqua` cũ để giữ bài bạn đang làm.
3. Chép các file code trong thư mục `Raucuqua` mới vào `WebsiteRauCuQua/Raucuqua`, thay các file trùng tên. Nếu đã dùng bản trước, **giữ nguyên `.env` và thư mục `server/data`**, không xóa thư mục `server` cũ rồi chép lại. Bộ ZIP không chứa dữ liệu cá nhân. Khi khởi động, máy chủ tự tạo bảng/cột mới và giữ nguyên tài khoản, sản phẩm, đơn hàng cũ.
4. Không chép `node_modules` từ máy khác; bộ ZIP không chứa thư mục này. Nếu thư viện cũ gây lỗi, xóa `node_modules` cũ rồi cài lại ở bước dưới.
5. Mở thư mục `Raucuqua` trong VS Code. Chọn **Terminal → New Terminal**. Terminal phải nằm tại thư mục chứa `package.json`.

## 2. Chạy dự án

Cài Node.js **24 LTS** (tối thiểu 22.13), vì backend dùng `node:sqlite` tích hợp. Sau khi cài, khởi động lại VS Code.

```bash
node -v
npm install
npm run dev
```

Mở **http://localhost:5173**. Lệnh `npm run dev` chạy cả giao diện và API. Giữ terminal đang chạy; **Ctrl+C** để dừng. Giao diện dùng cổng trong `WEB_ORIGIN` và không tự chuyển cổng khi cổng đang bận. Nếu 5173 đã bị chiếm, tắt dự án đang dùng cổng đó hoặc tạo `.env` cạnh `package.json` với `WEB_ORIGIN=http://localhost:5174`, rồi khởi động lại `npm run dev` và mở địa chỉ mới.

Nếu đăng nhập/đăng ký báo **Nguồn yêu cầu không hợp lệ**, đặt `WEB_ORIGIN` trong `.env` thành đúng địa chỉ gốc đang mở trên trình duyệt, ví dụ `http://localhost:5174` (không thêm `/dang-nhap`). Dừng và chạy lại `npm run dev` sau khi sửa `.env`. Hai file đã sửa cho lỗi này là `vite.config.js` và `server/security.js`; không cần xóa hay thay cơ sở dữ liệu `server/data`.

SQLite tự tạo tại `server/data/shop.sqlite`. Không cần cài MySQL. Dữ liệu tồn tại sau khi tắt và mở máy chủ. Không xóa file này nếu muốn giữ tài khoản, sản phẩm và đơn hàng.

## 3. Tạo tài khoản và các vai trò

- **Khách hàng:** đăng ký, tìm và xem sản phẩm, lưu yêu thích, quản lý giỏ hàng, đặt hàng, theo dõi đơn và tải hóa đơn của mình.
- **Nhân viên:** có chức năng khách hàng, cập nhật giá/tồn kho và xử lý đơn, xác nhận tiền COD/chuyển khoản sau khi kiểm tra đã nhận tiền.
- **Quản lý (Admin):** có quyền nhân viên; thêm, sửa toàn bộ, xóa/khôi phục sản phẩm; xem doanh thu theo ngày và tải báo cáo CSV; cấp quyền tài khoản; sửa thông tin cửa hàng/ngân hàng/phí giao hàng. Đăng nhập rồi bấm biểu tượng **Tài khoản → Trang Admin**, hoặc mở `/quan-ly`.

Tạo quản lý đầu tiên: mở terminal thứ hai tại cùng thư mục, chạy:

```bash
npm run create-manager
```

Nhập họ tên, email và mật khẩu riêng (8–128 ký tự). Chạy trên máy cá nhân; mật khẩu nhập vào terminal có hiển thị. Không có tài khoản quản lý/mật khẩu mặc định và không có cách tự chọn quyền quản lý từ trang đăng ký.

Đăng nhập bằng quản lý vừa tạo. Tài khoản nhân viên phải đăng ký như khách hàng trước, sau đó quản lý đổi vai trò thành **Nhân viên**. Không thể tự hạ quyền quản lý của chính mình.

## 4. Các thư mục/file nên đọc trước

| File hoặc thư mục                         | Dùng để làm gì?                                                     |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `src/main.jsx`                            | Khởi động React và bộ định tuyến                                    |
| `src/App.jsx`                             | Khai báo các đường dẫn/trang                                        |
| `src/index.css`                           | Font chữ, màu sắc, nút và các kiểu dùng chung                       |
| `src/App.css`                             | CSS theo từng khu vực; mục 8 là giao diện điện thoại                |
| `src/components/Header.jsx`               | Logo, menu, ô tìm kiếm, tài khoản, giỏ hàng, thông báo              |
| `src/components/Footer.jsx`               | Chân trang                                                          |
| `src/components/Feedback.jsx`             | Trạng thái tải, lỗi và thông báo ngắn                               |
| `src/features/products/`                  | Trang chủ, danh sách, thẻ và chi tiết sản phẩm                      |
| `src/features/auth/AuthPage.jsx`          | Form đăng nhập và đăng ký                                           |
| `src/features/account/`                   | Trang tài khoản, hồ sơ, đơn hàng, đổi mật khẩu và hỗ trợ            |
| `src/features/content/`                   | Thông tin, liên hệ, hướng dẫn và CSS giao diện mới                  |
| `src/features/cart/CartPage.jsx`          | Giỏ hàng, số lượng và tạm tính                                      |
| `src/features/checkout/`                  | Nhập người nhận, chọn thanh toán, kiểm tra tổng tiền và đặt hàng    |
| `src/features/orders/`                    | Danh sách/chi tiết đơn, trạng thái, lịch sử, tải hóa đơn và CSS mới |
| `src/features/favorites/`                 | Nút trái tim và danh sách yêu thích lưu trong tài khoản             |
| `src/features/notifications/`             | Trang thông báo                                                     |
| `src/features/admin/`                     | Admin: sản phẩm, danh mục, doanh thu, đơn hàng, tài khoản và hỗ trợ |
| `src/features/admin/ProductForm.jsx`      | Biểu mẫu nhập thông tin sản phẩm và gọi API lưu Database            |
| `src/features/admin/ProductManager.jsx`   | Danh sách, lọc, thêm/sửa/xóa/khôi phục sản phẩm                     |
| `src/features/admin/RevenueDashboard.jsx` | Doanh thu, biểu đồ theo ngày, bán chạy và xuất CSV                  |
| `src/features/admin/CategoryManager.jsx`  | Thêm, sửa và xóa danh mục từ Database                               |
| `src/features/admin/AccountsManager.jsx`  | Tìm tài khoản, xem hồ sơ và đổi quyền                               |
| `src/features/admin/InquiryManager.jsx`   | Xử lý và phản hồi yêu cầu liên hệ                                   |
| `server/routes/products.js`               | API đọc/thêm/sửa/xóa/khôi phục sản phẩm, kiểm tra quyền             |
| `server/routes/admin.js`                  | API báo cáo riêng cho quản lý                                       |
| `server/routes/categories.js`             | API danh mục, kiểm tra quyền và sản phẩm tham chiếu                 |
| `server/routes/account.js`                | Hồ sơ của chính mình và đổi mật khẩu                                |
| `server/routes/inquiries.js`              | Lưu liên hệ, kiểm tra quyền xem và phản hồi                         |
| `server/services/revenue.js`              | Câu lệnh SQL tính doanh thu, phí giao hàng và thống kê              |
| `ADMIN_DATABASE.md`                       | Hướng dẫn Admin, cách lưu và sao lưu Database                       |
| `GIAO_DIEN_TAI_KHOAN.md`                  | Hướng dẫn giao diện, danh mục, tài khoản và hỗ trợ mới              |
| `src/context/ShopContext.jsx`             | Chia sẻ tài khoản, giỏ hàng và sản phẩm giữa các trang              |
| `src/services/api.js`                     | Gọi API, định dạng tiền và tên vai trò                              |
| `server/index.js`                         | Khởi động máy chủ                                                   |
| `server/database.js`                      | Tạo/nâng cấp bảng SQLite, giữ dữ liệu cũ                            |
| `server/migrations/catalog.js`            | Nâng cấp danh mục và nạp mẫu một lần                                |
| `server/security.js`                      | Băm mật khẩu, cookie phiên và kiểm tra quyền                        |
| `server/routes/`                          | API riêng cho tài khoản, sản phẩm, giỏ hàng, thông báo, quản lý     |
| `server/products.js`                      | 8 sản phẩm minh họa ban đầu                                         |
| `server/services/orders.js`               | Kiểm tra quyền xem đơn, ghi lịch sử và hủy/hoàn kho                 |
| `server/services/vnpay.js`                | Tạo URL ký VNPay và xác minh IPN thanh toán                         |
| `server/services/invoice.js`              | Tạo hóa đơn PDF có tiếng Việt, tự chia nhiều trang                  |
| `server/services/settings.js`             | Thông tin cửa hàng, ngân hàng và phí giao hàng                      |
| `server/assets/`                          | Font và giấy phép font dùng trong PDF                               |
| `server/scripts/create-manager.js`        | Tạo quản lý đầu tiên trên máy chủ                                   |
| `server/tests/shop.test.js`               | Kiểm tra tài khoản, phân quyền và dữ liệu riêng                     |
| `server/tests/commerce.test.js`           | Kiểm tra đặt hàng, tồn kho, hóa đơn, yêu thích và callback VNPay    |
| `server/tests/admin.test.js`              | Kiểm tra CRUD, Database cũ, lưu qua khởi động lại và doanh thu      |
| `server/tests/catalog-account.test.js`    | Kiểm tra danh mục, hồ sơ, đổi mật khẩu và hỗ trợ                    |
| `PAYMENT_SETUP.md`                        | Hướng dẫn COD, chuyển khoản và kết nối VNPay thử nghiệm/thật        |
| `public/images/`                          | Ảnh sản phẩm; có thể thay bằng ảnh của bạn cùng tên                 |

## 5. Sửa tên cửa hàng, màu và sản phẩm

- Tên cửa hàng ở Header/Footer/Liên hệ: sửa trong **Tài khoản → Trang Admin → Cửa hàng & thanh toán**. Một số lời giới thiệu và tiêu đề tab trình duyệt có thể chỉnh trong các trang tương ứng và `index.html`.
- Màu xanh chính: đổi `--green` và `--dark` trong `src/index.css`.
- Ảnh: thay `public/images/tomato.jpg`, `broccoli.jpg`, `carrot.jpg`, `apple.jpg`, `orange.jpg`, `banana.jpg`, `cucumber.jpg`, `potato.jpg`. Ảnh có giấy phép miễn phí từ Unsplash; nguồn ghi ở `IMAGE_CREDITS.md`.
- Sản phẩm: **Tài khoản → Trang Admin → Sản phẩm → Thêm sản phẩm**. Nhập tên, danh mục, giá, đơn vị, tồn kho, ảnh, xuất xứ và mô tả rồi bấm **Lưu sản phẩm**. Dữ liệu được ghi vào SQLite và hiện trên trang bán hàng. Bấm **Sửa** để đổi thông tin, **Xóa** để ngừng bán; chọn **Đã xóa → Khôi phục** để bán lại. Nhân viên chỉ sửa giá/tồn kho. Xem `ADMIN_DATABASE.md` để hiểu chi tiết.
- `server/products.js` chứa sản phẩm mẫu. `server/migrations/catalog.js` nạp mẫu một lần, ghi dấu trong `app_migrations`; sau đó sản phẩm và danh mục đọc từ Database. Sửa file mẫu không ghi đè dữ liệu đã lưu. Không xóa Database để thử mẫu nếu còn muốn giữ tài khoản và đơn hàng.

## Menu, danh mục và tài khoản

Menu chính: **Trang chủ · Sản phẩm · Thông tin · Hướng dẫn mua hàng · Liên hệ**. Bấm mũi tên cạnh Sản phẩm để mở danh mục từ Database. Trang chủ có thanh liên kết cuộn đến Danh mục, Sản phẩm, Về chúng tôi, Cách mua hàng và Kết nối. Trái tim Yêu thích nằm cạnh giỏ hàng.

Bấm **Tài khoản** để sửa tên/điện thoại/địa chỉ, xem đơn hàng, đổi mật khẩu, thông báo, yêu thích và hỗ trợ. Nhân viên/quản lý có lối vào khu vực làm việc tại đây. Điện thoại/địa chỉ đã lưu được gợi ý khi thanh toán. Email đăng nhập giữ nguyên; đổi mật khẩu cần nhập mật khẩu cũ và kết thúc các phiên cũ.

Quản lý vào **Danh mục sản phẩm** để thêm/sửa tên, mô tả, thứ tự, hoặc xóa nhóm rỗng. Nhóm mới có ngay trong menu, trang chủ, bộ lọc và form sản phẩm. Xem `GIAO_DIEN_TAI_KHOAN.md` để đọc cấu trúc file và cách sử dụng.

## 6. Hoạt động của giỏ hàng và thông báo

Khách chưa đăng nhập lưu giỏ hàng trên trình duyệt. Sau đăng nhập, giỏ đó được gộp vào giỏ của tài khoản, giới hạn theo tồn kho và tối đa 999 đơn vị mỗi món. Giỏ tài khoản lưu trên máy chủ. Nếu quản lý giảm tồn kho sau khi thêm món, giỏ sẽ nhắc bạn điều chỉnh số lượng. Đây chưa phải chức năng giữ hàng.

Thông báo tạo khi đăng ký, thêm món mới vào giỏ, đổi quyền, tạo/hủy đơn, thay đổi giao hàng và xác nhận thanh toán. Mỗi người chỉ xem được thông báo của mình. Đây là thông báo trong website, chưa có email/push thời gian thực.

## Đặt hàng, thanh toán và yêu thích

- **Giỏ hàng → Tiến hành thanh toán:** đăng nhập, nhập người nhận/địa chỉ, kiểm tra tổng tiền, chọn COD/chuyển khoản/VNPay và đặt đơn.
- **Đơn hàng → Xem chi tiết:** xem sản phẩm và giá tại lúc đặt, địa chỉ, trạng thái, lịch sử, thông tin thanh toán; tải hóa đơn PDF. Chỉ hủy đơn chưa xác nhận và chưa thanh toán; giao dịch VNPay đang chờ không được hủy.
- **Trái tim trên sản phẩm → Yêu thích:** lưu/bỏ lưu sản phẩm vào tài khoản. Cần đăng nhập để dùng.
- **Tài khoản → Trang Admin → Đơn hàng:** nhân viên/quản lý xem đơn khách, xác nhận tiền COD/chuyển khoản và cập nhật giao hàng đúng trình tự. Thanh toán VNPay chỉ do callback đã xác minh cập nhật.
- **Tài khoản → Trang Admin → Cửa hàng & thanh toán:** quản lý nhập ngân hàng, địa chỉ cửa hàng và phí giao hàng. COD dùng ngay. Chuyển khoản chỉ bật sau khi nhập đủ thông tin ngân hàng. VNPay chỉ bật khi có cấu hình riêng trong `.env`; xem `PAYMENT_SETUP.md`.

Phí giao hàng mặc định 25.000đ, miễn phí từ 300.000đ, có thể đổi trong trang quản lý. Tồn kho được trừ khi tạo đơn và hoàn lại một lần nếu hủy hợp lệ. Bản này chưa tự hủy đơn chưa thanh toán theo thời gian.

Hóa đơn PDF là chứng từ đơn hàng, chưa phải hóa đơn VAT. Thông tin cửa hàng, giá và ngân hàng được lưu theo thời điểm đặt để đơn cũ không thay đổi khi cập nhật cấu hình.

## 7. Kiểm tra và bản chạy đã build

```bash
npm test
npm run build
npm start
```

Sau build, mở **http://localhost:3001**. Express phục vụ cả giao diện và API trên một cổng. `npm test` dùng cơ sở dữ liệu tạm riêng, không đụng dữ liệu cửa hàng.

## Phạm vi hiện tại

Đã có: trang chủ với menu cuộn theo phần, menu danh mục xổ xuống, Thông tin/Hướng dẫn/Liên hệ, trang tài khoản, hồ sơ và đổi mật khẩu, hỗ trợ có phản hồi, danh mục động, tìm kiếm tiếng Việt không dấu, sắp xếp giá, chi tiết sản phẩm, yêu thích, tài khoản thật, phân quyền tại máy chủ, giỏ hàng, đặt hàng, COD, chuyển khoản xác nhận thủ công, mã kết nối VNPay, hóa đơn PDF, lịch sử đơn, thông báo và Admin thêm/sửa/xóa/khôi phục sản phẩm, doanh thu theo ngày, xuất CSV, quản lý đơn hàng/tài khoản/cài đặt cửa hàng.

Giá, xuất xứ và số lượng sản phẩm ban đầu là dữ liệu minh họa. Chưa có quên mật khẩu, xác minh email, tải ảnh trực tiếp qua form, hóa đơn thuế, hoàn tiền và đối soát VNPay tự động. Chưa chạy thanh toán VNPay thật với tài khoản của bạn; cần cấu hình người bán và IPN công khai. Đây là bộ code chạy trên máy bạn, chưa xuất bản lên Internet. Khi triển khai HTTPS cần bật `COOKIE_SECURE=true`, cấu hình đúng tên miền, nơi lưu SQLite bền vững và sao lưu dữ liệu.
>>>>>>> 22204cf (Initial commit)

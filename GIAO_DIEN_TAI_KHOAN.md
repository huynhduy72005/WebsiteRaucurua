# Giao diện, danh mục, tài khoản và liên hệ

## Chạy bản cập nhật

Chép các file code mới vào thư mục `Raucuqua`, **giữ nguyên `.env`, `server/data` và ảnh riêng của bạn**. Không xóa thư mục `server` cũ rồi thay cả thư mục. Mở terminal tại nơi có `package.json`:

```bash
npm install
npm run dev
```

Database sẽ được nâng cấp khi máy chủ chạy. Tài khoản, sản phẩm, đơn hàng và thanh toán cũ được giữ. Địa chỉ mặc định là `http://localhost:5173`; dùng cổng khác nếu `.env` của bạn đã đổi.

## Menu mới

| Vị trí               | Cách dùng                                                        |
| -------------------- | ---------------------------------------------------------------- |
| Trang chủ            | Hero, danh mục, sản phẩm, giới thiệu, hướng dẫn và liên hệ nhanh |
| Sản phẩm             | Bấm chữ để xem toàn bộ; bấm mũi tên để mở danh mục từ Database   |
| Thông tin            | Giới thiệu cửa hàng và cách mua sắm                              |
| Hướng dẫn mua hàng   | Các bước đặt hàng và câu hỏi thường gặp                          |
| Liên hệ              | Thông tin cửa hàng và biểu mẫu gửi yêu cầu hỗ trợ                |
| Biểu tượng trái tim  | Mở sản phẩm yêu thích; số nhỏ là số món đã lưu                   |
| Biểu tượng giỏ hàng  | Mở giỏ hàng; số nhỏ là tổng số đơn vị đã chọn                    |
| Biểu tượng tài khoản | Hồ sơ, đơn hàng, mật khẩu, hỗ trợ và lối vào Admin/nhân viên     |

Thanh nhỏ trên trang chủ có **Danh mục · Sản phẩm · Về chúng tôi · Cách mua hàng · Kết nối**. Các liên kết cuộn tới đúng phần trên trang. Trên điện thoại có thể vuốt ngang thanh này. Menu chính mở bằng nút ba gạch; danh mục mở bằng mũi tên. Nhấn Escape hoặc bấm ngoài để đóng danh mục trên máy tính.

## Trang Tài khoản

Mở `/tai-khoan`. Chưa đăng nhập sẽ được chuyển sang trang đăng nhập rồi trở lại tài khoản.

- **Thông tin tài khoản:** sửa họ tên, điện thoại và địa chỉ mặc định. Email đăng nhập giữ nguyên. Website dùng thông tin đã lưu để gợi ý khi thanh toán; bạn vẫn được sửa người nhận/địa chỉ cho từng đơn.
- **Đơn hàng của tôi:** xem trạng thái và mở chi tiết đơn để tải hóa đơn hoặc hủy khi được phép.
- **Đổi mật khẩu:** nhập mật khẩu hiện tại, mật khẩu mới và nhập lại. Mật khẩu mới cần 8–128 ký tự; website kết thúc các phiên cũ và giữ một phiên mới trên trình duyệt hiện tại.
- **Hỗ trợ:** xem yêu cầu đã gửi khi đăng nhập và phản hồi từ cửa hàng.
- **Yêu thích/Thông báo:** mở danh sách riêng của tài khoản.
- **Trang Admin/Khu vực nhân viên:** xuất hiện theo quyền. Khách hàng không có quyền quản trị.

Nếu chưa có quản lý, chạy `npm run create-manager` trong terminal thứ hai. Nhân viên đăng ký như khách hàng, sau đó quản lý cấp quyền.

## Quản lý danh mục sản phẩm

Vào **Tài khoản → Trang Admin → Danh mục sản phẩm**:

1. Bấm **Thêm danh mục**, nhập tên, mô tả ngắn và thứ tự hiển thị.
2. Bấm **Lưu danh mục**. Ví dụ tên “Rau gia vị” sẽ có mã `rau-gia-vi`.
3. Mở tab **Sản phẩm**, thêm/sửa sản phẩm và chọn danh mục mới.
4. Menu xổ xuống, trang chủ và bộ lọc sẽ đọc danh mục này. Khách đang mở trang từ trước cần tải lại để thấy cập nhật.

Tên có thể sửa, mã được giữ để không làm hỏng liên kết cũ. Số thứ tự nhỏ hiển thị trước. Khi trùng thứ tự, nhóm sắp theo tên.

**Chỉ xóa nhóm rỗng.** Nếu nhóm còn sản phẩm, kể cả sản phẩm đã xóa khỏi cửa hàng, phải sửa các sản phẩm đó sang nhóm khác trước. Database bảo vệ quan hệ này. Nhóm đã xóa không tự xuất hiện lại khi khởi động máy chủ.

Database lưu vào bảng `categories`. Trong `products`, cột `category` chứa mã nhóm. `server/migrations/catalog.js` tạo bảng mới, giữ nhóm trong dữ liệu cũ, nạp mẫu một lần và tạo ràng buộc kiểm tra bằng trigger SQLite. Bảng `app_migrations` ghi rằng việc nạp mẫu đã hoàn thành.

## Xem thông tin khách hàng và nhân viên

Vào **Tài khoản → Trang Admin → Tài khoản & phân quyền**:

- Tìm theo tên, email hoặc điện thoại; lọc khách hàng, nhân viên, quản lý.
- Bấm **Xem** để xem email, số điện thoại, địa chỉ, ngày đăng ký, số đơn đã đặt và 5 đơn gần nhất.
- Quản lý có thể đổi quyền của tài khoản khác; không tự hạ quyền của mình.
- Mật khẩu và mã phiên không được trả về API hoặc hiển thị. Nhân viên không được xem danh sách/hồ sơ tài khoản khác.

## Liên hệ và phản hồi

Thông tin điện thoại, địa chỉ, tên cửa hàng đọc từ **Trang Admin → Cửa hàng & thanh toán**. Các thông tin chưa nhập sẽ có nội dung chờ cập nhật, không dùng số điện thoại hay địa chỉ giả.

Biểu mẫu Liên hệ lưu nội dung vào bảng `inquiries`. Nếu đăng nhập trước khi gửi, khách có thể theo dõi tại **Tài khoản → Hỗ trợ**.

Nhân viên/quản lý mở **Liên hệ & hỗ trợ**, chọn yêu cầu, cập nhật trạng thái và nhập phản hồi. Khách đăng nhập nhận thông báo trong website và xem phản hồi của mình. Yêu cầu gửi khi chưa đăng nhập vẫn được lưu, nhưng phản hồi trong Admin là ghi chú nội bộ; cửa hàng cần chủ động liên hệ qua thông tin khách cung cấp. Website chưa gửi email tự động.

## Đọc và chỉnh code theo từng phần

| File/thư mục                                               | Dùng khi muốn chỉnh                               |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `src/components/Header.jsx`                                | Menu, xổ danh mục, icon giỏ/yêu thích/tài khoản   |
| `src/features/products/HomePage.jsx`                       | Các phần và menu cuộn trang chủ                   |
| `src/features/products/HeroSection.jsx`                    | Khối giới thiệu đầu trang                         |
| `src/features/products/CategorySection.jsx`                | Thẻ danh mục trên trang chủ                       |
| `src/features/content/storefront.css`                      | Màu nền, bố cục, menu, trang chủ và điện thoại    |
| `src/features/content/AboutSection.jsx`                    | Phần giới thiệu dùng chung                        |
| `src/features/content/InformationPage.jsx`                 | Trang Thông tin                                   |
| `src/features/content/GuidePage.jsx`, `ShoppingGuide.jsx`  | Hướng dẫn và câu hỏi thường gặp                   |
| `src/features/content/ContactPage.jsx`                     | Biểu mẫu và thông tin liên hệ                     |
| `src/features/account/AccountPage.jsx`                     | Khung trang và menu tài khoản                     |
| `src/features/account/ProfileForm.jsx`                     | Sửa hồ sơ cá nhân                                 |
| `src/features/account/PasswordForm.jsx`                    | Đổi mật khẩu                                      |
| `src/features/account/SupportHistory.jsx`                  | Yêu cầu hỗ trợ và phản hồi của khách              |
| `src/features/account/account.css`                         | Bố cục trang tài khoản                            |
| `src/features/admin/CategoryManager.jsx`                   | Thêm/sửa/xóa danh mục                             |
| `src/features/admin/AccountsManager.jsx`, `UserDetail.jsx` | Tìm và xem hồ sơ khách/nhân viên                  |
| `src/features/admin/InquiryManager.jsx`                    | Xử lý và phản hồi liên hệ                         |
| `src/context/ShopContext.jsx`                              | Dữ liệu chung đọc từ API                          |
| `server/routes/categories.js`                              | Lưu danh mục và kiểm tra quyền                    |
| `server/routes/account.js`                                 | Sửa hồ sơ và đổi mật khẩu                         |
| `server/routes/users.js`                                   | Hồ sơ dành cho quản lý và phân quyền              |
| `server/routes/inquiries.js`                               | Lưu, đọc và phản hồi liên hệ                      |
| `server/migrations/catalog.js`                             | Nâng cấp cấu trúc danh mục và quan hệ Database    |
| `server/tests/catalog-account.test.js`                     | Kiểm tra dữ liệu, phân quyền, mật khẩu và liên hệ |

Màu chính vẫn ở `src/index.css`. Các khối mới được tách theo tính năng; CSS có chú thích theo khu vực. Để thay hình minh họa trang chủ, sửa đường dẫn ảnh trong `HeroSection.jsx` hoặc thay file tương ứng trong `public/images`.

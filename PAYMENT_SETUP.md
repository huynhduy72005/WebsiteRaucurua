# Thanh toán COD, chuyển khoản và VNPay

## 1. COD — dùng ngay

Khách vào **Giỏ hàng → Tiến hành thanh toán**, nhập người nhận, số điện thoại và địa chỉ, chọn **Thanh toán khi nhận hàng**, rồi xác nhận đặt hàng.

Giá, phí giao hàng và tồn kho được kiểm tra tại máy chủ. Khi đơn tạo thành công, sản phẩm được trừ khỏi số lượng còn bán và giỏ được xóa. Mỗi lần đặt có mã yêu cầu riêng để chống tạo đơn trùng khi gửi lại yêu cầu.

Nhân viên/quản lý vào **Tài khoản → Trang Admin/Khu vực nhân viên → Đơn hàng**, mở đơn và chuyển theo thứ tự **Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao**. Trước khi đánh dấu đã giao, xác nhận đã thu đủ tiền COD và ghi nhận thu tiền. Khách không tự đánh dấu đã thanh toán.

## 2. Chuyển khoản ngân hàng

1. Đăng nhập bằng quản lý.
2. Vào **Tài khoản → Trang Admin → Cửa hàng & thanh toán**.
3. Nhập ngân hàng, số tài khoản và tên chủ tài khoản thật của cửa hàng; nhấn **Lưu**.
4. Khách có thể chọn chuyển khoản ở bước thanh toán. Chi tiết đơn hiển thị số tiền, tài khoản và mã đơn dùng làm nội dung chuyển khoản.
5. Sau khi kiểm tra tiền đã vào tài khoản, nhân viên/quản lý mở đơn, nhập mã giao dịch và bấm **Xác nhận đã nhận tiền**.

Đây là xác nhận chuyển khoản thủ công, chưa đọc số dư hoặc lịch sử ngân hàng tự động. Không có số tài khoản giả được tạo sẵn. Ngân hàng của đơn cũ không thay đổi khi quản lý sửa cài đặt.

Phí giao hàng mặc định là **25.000đ**, miễn phí từ **300.000đ**. Quản lý có thể đổi trong cùng trang. Tổng tiền luôn được hiển thị trước khi khách xác nhận.

## 3. VNPay — đã có mã kết nối, cần tài khoản người bán

Tích hợp theo tài liệu chính thức: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

### Cấu hình thử nghiệm

1. Đăng ký tài khoản thử nghiệm của riêng bạn tại https://sandbox.vnpayment.vn/devreg/ để nhận `TmnCode` và `HashSecret`.
2. Sao chép `.env.example` thành `.env` cạnh `package.json`. Điền thông tin do VNPay cấp:

```env
PORT=3001
WEB_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
VNPAY_TMN_CODE=MA_DO_VNPAY_CAP
VNPAY_HASH_SECRET=KHOA_BI_MAT_DO_VNPAY_CAP
VNPAY_RETURN_URL=http://localhost:5173/api/payments/vnpay/return
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

Các giá trị viết hoa bên trên là chỗ để bạn điền, không phải thông tin kết nối sử dụng được. Không đưa `.env` lên GitHub; không dùng tiền tố `VITE_` cho khóa bí mật. Không cần gửi khóa bí mật trong cuộc trò chuyện.

3. Khởi động lại `npm run dev`. Nếu dùng cổng khác 5173, đổi cả `WEB_ORIGIN` và `VNPAY_RETURN_URL` cho đúng.
4. Đăng ký với VNPay URL **IPN** mà máy chủ VNPay có thể truy cập: `https://TEN-MIEN-CUA-BAN/api/payments/vnpay/ipn`. VNPay không truy cập được `localhost`; chỉ chạy local và Return URL chưa đủ để cập nhật thanh toán.
5. Khi đã có môi trường website/API công khai đúng cấu hình, thử giao dịch bằng thông tin thử nghiệm VNPay cung cấp. Môi trường sandbox không thu tiền thật.

### Cách xác minh kết quả

- Máy chủ tạo URL VNPay 2.1.0, số tiền VND nhân 100, tham chiếu riêng cho từng giao dịch, thời gian GMT+7 và chữ ký HMAC-SHA512.
- `GET /api/payments/vnpay/return` chỉ xác minh và đưa người dùng về trang đơn hàng; không đánh dấu đã trả tiền.
- `GET /api/payments/vnpay/ipn` kiểm tra chữ ký, mã người bán, số tiền, tham chiếu và trạng thái giao dịch rồi mới cập nhật đơn.
- Callback lặp lại không ghi nhận thanh toán thêm lần nữa. Nhân viên/quản lý không thể xác nhận thủ công một đơn VNPay.
- Giao dịch được xác nhận thất bại có thể thử lại trên **cùng đơn hàng**, bằng tham chiếu mới. Khi một giao dịch còn chờ kết quả, hệ thống dùng lại URL đang có và ngăn hủy đơn để tránh hoàn kho trong lúc tiền đang được xử lý.
- Nếu URL đã hết 15 phút nhưng vẫn chưa nhận IPN, đơn không tự ghi nhận thất bại hay tự hoàn kho. Cần đối soát với VNPay; bản này chưa có API truy vấn/hoàn tiền tự động. Không chỉnh trực tiếp trạng thái “đã thanh toán” để bỏ qua kiểm tra.

### Thanh toán thật

Cần tài khoản người bán và cấu hình production được VNPay cấp/đồng ý, website HTTPS, Return/IPN công khai đúng tên miền. Chuyển endpoint sang `https://pay.vnpay.vn/vpcpay.html`, dùng thông tin production riêng, bật `COOKIE_SECURE=true` và đặt `WEB_ORIGIN` đúng tên miền. Backend hiện chạy Node + SQLite; cần máy chủ có nơi lưu dữ liệu bền vững, sao lưu và proxy HTTPS phù hợp.

Đã kiểm tra chữ ký/callback bằng giao dịch mô phỏng trong bộ test. Chưa chạy giao dịch thật với tài khoản người bán của bạn vì chưa có thông tin kết nối.

## 4. Hóa đơn PDF và phạm vi

Mở **Đơn hàng → Xem chi tiết → Xuất hóa đơn PDF**. PDF dùng font có tiếng Việt, thông tin cửa hàng/người nhận, trạng thái, tên món, đơn giá lúc đặt, số lượng, phí giao hàng và tổng tiền. Khách chỉ tải được hóa đơn của mình; nhân viên/quản lý được xem hóa đơn khi xử lý đơn.

Đây là chứng từ đơn hàng của cửa hàng, **không phải hóa đơn VAT/hoá đơn điện tử của cơ quan thuế**. Bản này chưa có hoàn tiền, hủy đơn đã thanh toán, đối soát tự động hoặc kết nối dịch vụ hóa đơn điện tử.

Khách và nhân viên chỉ hủy được đơn chưa xác nhận, chưa thanh toán và không có giao dịch VNPay đang chờ. Hủy thành công hoàn kho đúng một lần. Đơn chưa thanh toán chưa được tự động hủy theo thời gian; nhân viên theo dõi trong danh sách đơn.

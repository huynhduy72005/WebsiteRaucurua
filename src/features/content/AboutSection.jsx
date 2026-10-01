import { Link } from "react-router-dom";
import { Leaf, Heart, ArrowUpRight } from "lucide-react";
import { useShop } from "../../context/ShopContext";
export default function AboutSection() {
  const { storeSettings } = useShop();
  return (
    <section className="about-section" id="ve-chung-toi">
      <div className="about-visual">
        <img
          src="/images/carrot.jpg"
          alt="Cà rốt cho căn bếp gia đình"
          loading="lazy"
        />
        <span>
          <Heart size={22} />
          Từ điều nhỏ, thêm yêu thương
        </span>
      </div>
      <div className="about-copy">
        <span className="eyebrow">
          <Leaf size={15} /> CÂU CHUYỆN CỦA KHU VƯỜN
        </span>
        <h2>Một bữa ăn ngon bắt đầu từ lựa chọn giản dị.</h2>
        <p>
          {storeSettings?.storeName || "Vườn Nhà"} là nơi bạn tìm rau củ và trái
          cây cho bữa ăn hàng ngày. Xem rõ quy cách, giá bán và xuất xứ; lưu món
          yêu thích và đặt hàng theo nhu cầu của gia đình.
        </p>
        <p>
          Chúng tôi làm việc để việc chọn món trở nên nhẹ nhàng: dễ tìm, dễ đặt
          và dễ theo dõi.
        </p>
        <Link className="text-link" to="/lien-he">
          Kết nối với cửa hàng <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  );
}

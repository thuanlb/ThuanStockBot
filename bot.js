require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const sendMessage = async (message) => {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
    console.log(`✅ Đã gửi: ${message}`);
  } catch (err) {
    console.error('❌ Gửi lỗi:', err.response?.data || err.message);
  }
};

const fetchVN30Stocks = async () => {
  try {
    const res = await axios.get('https://iboard-query.ssi.com.vn/v2/stock/group/VN30', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/110 Safari/537.36'
      }
    });

    const stocks = res.data?.data;

    if (!stocks || stocks.length === 0) {
      console.log('❌ Không có dữ liệu từ API.');
      return;
    }

    // Lọc các mã giảm mạnh trên 5%
    const selectedStocks = stocks.filter(stock => stock.cp < -1);

    if (selectedStocks.length === 0) {
      console.log('📉 Không có mã nào thỏa điều kiện.');
      return;
    }

    for (let stock of selectedStocks) {
      const symbol = stock.ss;
      const price = stock.mp;
      const changePercent = stock.cp.toFixed(2);
      const volume = stock.lv; // Khối lượng giao dịch hiện tại
      const avgVolume = stock.bfq; // Khối lượng trung bình 20 phiên

      // Tạo thông điệp chỉ gửi thông tin về khối lượng và so sánh với khối lượng trung bình
      const message = `📊 *Thông tin khối lượng*\nCổ phiếu: *${symbol}*\nGiá hiện tại: *${price}* đ\nGiảm: *${changePercent}%*\nKhối lượng giao dịch hiện tại: *${volume}*\nKhối lượng trung bình (20 phiên): *${avgVolume}*\nKhối lượng giao dịch hiện tại ${volume > avgVolume ? 'lớn hơn' : 'nhỏ hơn'} khối lượng trung bình.`;

      await sendMessage(message);
    }

  } catch (error) {
    console.error('❌ Lỗi fetch dữ liệu:', error.response?.data || error.message);
  }
};

// Lịch trình chỉ gửi tin nhắn vào mốc 0, 15, 30, hoặc 45 phút mỗi giờ trong khung giờ giao dịch
cron.schedule('*/15 9-15 * * *', () => {
  const now = new Date();
  const minutes = now.getMinutes();

  // Kiểm tra nếu thời gian là 0, 15, 30, hoặc 45 phút
  if (minutes === 0 || minutes === 15 || minutes === 30 || minutes === 45) {
    console.log(`🚀 Quét lúc ${now.toLocaleTimeString()}`);
    fetchVN30Stocks();
  } else {
    console.log(`⏸ Không gửi tin nhắn lúc ${now.toLocaleTimeString()}`);
  }
});

// Gọi ngay khi khởi động nếu trong giờ giao dịch
const init = () => {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 15) {
    fetchVN30Stocks();
  } else {
    console.log('⏳ Đang ngoài giờ giao dịch. Chờ đến 9h...');
  }
};

init();

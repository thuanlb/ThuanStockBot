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
    const res = await axios.get(process.env.STOCK_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/110 Safari/537.36'
      }
    });

    const stocks = res.data?.data;

    if (!stocks || stocks.length === 0) {
      console.log('❌ Không có dữ liệu từ API.');
      return;
    }

    const selectedStocks = stocks.filter(stock => stock.priceChangePercent < -2);
    selectedStocks.sort((a, b) => b.priceChangePercent - a.priceChangePercent);

    if (selectedStocks.length === 0) {
      console.log('📉 Không có mã nào thỏa điều kiện.');
      return;
    }

    const time = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    for (let stock of selectedStocks) {
      const symbol = stock.stockSymbol;
      const price = stock.matchedPrice;
      const changePercent = stock.priceChangePercent.toFixed(2);
      const volume = stock.nmTotalTradedQty || 0;

      const totalBuyVolume =
        (stock.best1BidVol || 0) +
        (stock.best2BidVol || 0) +
        (stock.best3BidVol || 0);
      const totalSellVolume =
        (stock.best1OfferVol || 0) +
        (stock.best2OfferVol || 0) +
        (stock.best3OfferVol || 0);

      const message = `
━━━━━━━━━━━━━━━━━━━
🕒 *${time}* – *Tín hiệu mua*
🏷️ Cổ phiếu: *${symbol}*
💵 Giá hiện tại: *${price.toLocaleString()}* đ
📉 Giảm: *${changePercent}%*

🔹 Tổng KL Mua: *${totalBuyVolume.toLocaleString()}*
🔸 Tổng KL Bán: *${totalSellVolume.toLocaleString()}*
📊 KL hiện tại: *${volume.toLocaleString()}*
`;

      await sendMessage(message);
    }

  } catch (error) {
    console.error('❌ Lỗi fetch dữ liệu:', error.response?.data || error.message);
  }
};

cron.schedule('0,15,30,45 9-15 * * *', () => {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();

  if (hour === 15 && minutes > 0) {
    console.log(`⏸ Đã quá 15h00 – Không gửi nữa.`);
    return;
  }

  console.log(`🚀 Quét lúc ${now.toLocaleTimeString()}`);
  fetchVN30Stocks();
});

const init = () => {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 15) {
    fetchVN30Stocks();
  } else {
    console.log('⏳ Đang ngoài giờ giao dịch. Chờ đến 9h...');
  }
};

init();

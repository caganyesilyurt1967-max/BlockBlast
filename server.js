const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Bağlantısı (Vercel'deki o uzun linki çeker)
const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
  .then(() => console.log("MongoDB bağlantısı başarılı! ✅"))
  .catch(err => console.error("MongoDB bağlantı hatası: ❌", err));

// MODELLER (Eğer modeller bir klasördeyse yolunu './modeller/User' yapmalısın)
const User = require('./User');
const Score = require('./Score');

// --- ROTALAR ---

// Ana Sayfa Testi
app.get('/', (req, res) => {
  res.send('Blok Patlatma Sunucusu Aktif! Hile koruması devrede. 🛡️');
});

// Skorları Getir (Leaderboard)
app.get('/leaderboard', async (req, res) => {
  try {
    const scores = await Score.find().populate('user').sort({ score: -1 }).limit(10);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: "Skorlar alınamadı." });
  }
});

// HİLE KORUMALI SKOR KAYDETME
app.post('/add-score', async (req, res) => {
  const { username, score } = req.body;

  // 🛡️ KORUMA 1: Mantıksız Skor Kontrolü (Örn: 1 milyondan fazla skor hiledir)
  if (typeof score !== 'number' || score > 1000000 || score < 0) {
    return res.status(403).json({ error: "Hile tespit edildi: Geçersiz skor!" });
  }

  try {
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({ username });
      await user.save();
    }

    // 🛡️ KORUMA 2: Spam/Hızlı Skor Atma Engeli (5 saniye kuralı)
    const lastScore = await Score.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (lastScore) {
      const fark = (Date.now() - new Date(lastScore.createdAt).getTime()) / 1000;
      if (fark < 5) {
        return res.status(429).json({ error: "Çok hızlı skor gönderiyorsun, biraz bekle!" });
      }
    }

    const newScore = new Score({ user: user._id, score });
    await newScore.save();
    res.json({ message: "Skor güvenli bir şekilde kaydedildi!" });

  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});

module.exports = app;

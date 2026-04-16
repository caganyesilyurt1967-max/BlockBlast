const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Bağlantısı
const uri = process.env.MONGODB_URI;
mongoose.connect(uri)
  .then(() => console.log("MongoDB bağlantısı başarılı!"))
  .catch(err => console.error("MongoDB bağlantı hatası:", err));

// Modeller
const User = require('./User');
const Score = require('./Score');

// --- ROTALAR ---

app.get('/', (req, res) => {
  res.send('Hile Korumalı Sunucu Aktif!');
});

app.get('/leaderboard', async (req, res) => {
  try {
    const scores = await Score.find().populate('user').sort({ score: -1 }).limit(10);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: "Skorlar alınamadı." });
  }
});

// --- GÜVENLİ SKOR KAYDETME ---
app.post('/add-score', async (req, res) => {
  const { username, score } = req.body;

  // 🛡️ KORUMA 1: Tip ve Mantık Kontrolü
  if (typeof score !== 'number' || score > 1000000 || score < 0) {
    return res.status(403).json({ error: "Geçersiz skor! Hile girişimi reddedildi." });
  }

  try {
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({ username });
      await user.save();
    }

    // 🛡️ KORUMA 2: Zaman Kontrolü (Spam Engelleme)
    const lastScore = await Score.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (lastScore) {
      const simdi = new Date();
      const oncekiSkorZamani = new Date(lastScore.createdAt);
      const fark = (simdi - oncekiSkorZamani) / 1000; // Saniye cinsinden

      if (fark < 5) { // 5 saniyeden önce yeni skor atamaz
        return res.status(429).json({ error: "Çok hızlı skor gönderiyorsun! Biraz bekle." });
      }
    }

    // 🛡️ KORUMA 3: Kayıt İşlemi
    const newScore = new Score({ user: user._id, score });
    await newScore.save();
    res.json({ message: "Skor güvenli bir şekilde kaydedildi!" });

  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});

module.exports = app;

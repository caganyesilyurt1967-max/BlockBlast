const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Bağlantısı
const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
  .then(() => console.log("MongoDB bağlantısı başarılı! ✅"))
  .catch(err => console.error("Bağlantı hatası:", err));

// MODELLER (Dosyaların yan yana olduğunu varsayıyorum)
// EĞER hata devam ederse burayı './modeller/User' olarak değiştirirsin
const User = require('./User');
const Score = require('./Score');

// --- ROTALAR ---

app.get('/', (req, res) => {
  res.send('Sunucu Aktif! Skorlar için /leaderboard adresine git.');
});

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

  // Skor kontrolü (ReferenceError almamak için her değişkeni kontrol ediyoruz)
  if (typeof score !== 'number' || score > 1000000) {
    return res.status(403).json({ error: "Geçersiz skor!" });
  }

  try {
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({ username });
      await user.save();
    }

    // Skor Kaydı
    const newScore = new Score({ 
      user: user._id, 
      score: score 
    });
    await newScore.save();
    
    res.json({ message: "Skor başarıyla kaydedildi!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu çalışıyor.`));

module.exports = app;

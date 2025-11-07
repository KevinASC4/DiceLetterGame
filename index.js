// index.js
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const letterCosts = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,
  M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
};

const letterPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

app.get('/roll', (req, res) => {
  const count = parseInt(req.query.count) || 1;
  const letters = [];
  for (let i = 0; i < count; i++) {
    letters.push(letterPool[Math.floor(Math.random() * letterPool.length)]);
  }
  res.json({ letters });
});

app.post('/check-word', async (req, res) => {
  try {
    const { word } = req.body;
    if (!word || !word.trim()) {
      return res.json({ valid: false, score: 0, error: "empty word" });
    }

    const encodedWord = encodeURIComponent(word.trim().toLowerCase());
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodedWord}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.json({ valid: false, score: 0 });
    }

    const score = word
      .toUpperCase()
      .split('')
      .reduce((acc, ch) => acc + (letterCosts[ch] || 0), 0);

    res.json({ valid: true, score });
  } catch (err) {
    console.error("❌ Error checking word:", err);
    res.status(500).json({ valid: false, score: 0 });
  }
});

app.listen(PORT, () => console.log(`✅ Server running: http://localhost:${PORT}`));

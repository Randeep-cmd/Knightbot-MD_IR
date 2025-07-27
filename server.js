// server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ KnightBot is Alive!');
});

app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});

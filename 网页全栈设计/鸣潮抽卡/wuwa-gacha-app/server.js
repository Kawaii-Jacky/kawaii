const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Serve static files from root directory of wuwa-gacha-app
app.use(express.static(path.join(__dirname)));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'src')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🌊 鸣潮“夜将寒色去” 1:1 抽卡服务启动成功！`);
  console.log(`🔗 本地访问地址: http://localhost:${PORT}`);
  console.log(`==================================================`);
});

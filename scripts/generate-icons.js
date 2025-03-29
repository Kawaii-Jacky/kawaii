const fs = require('fs');
const { createCanvas } = require('canvas');
const path = require('path');

// 确保 images 目录存在
const imagesDir = path.join(__dirname, '../miniprogram/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 图标配置
const icons = [
  { name: 'home', color: '#999999', activeColor: '#07c160' },
  { name: 'solar', color: '#999999', activeColor: '#07c160' },
  { name: 'network', color: '#999999', activeColor: '#07c160' }
];

// 创建图标的函数
function createIcon(name, color, activeColor) {
  // 创建普通图标
  const canvas = createCanvas(81, 81);
  const ctx = canvas.getContext('2d');
  
  // 绘制纯色背景
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 81, 81);
  
  // 保存普通图标
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(imagesDir, `${name}.png`), buffer);
  
  // 创建激活状态图标
  ctx.fillStyle = activeColor;
  ctx.fillRect(0, 0, 81, 81);
  
  // 保存激活状态图标
  const activeBuffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(imagesDir, `${name}-active.png`), activeBuffer);
}

// 生成所有图标
icons.forEach(icon => {
  createIcon(icon.name, icon.color, icon.activeColor);
});

console.log('图标生成完成！'); 
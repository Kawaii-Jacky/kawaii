const fs = require('fs');
const path = require('path');

// 确保 images 目录存在
const imagesDir = path.join(__dirname, '../miniprogram/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 创建一个简单的 1x1 像素的 PNG 图片的 Base64 编码
const createBase64PNG = (color) => {
  // 这是一个 1x1 像素的 PNG 图片的 Base64 编码
  const base64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`;
  return Buffer.from(base64, 'base64');
};

// 图标配置
const icons = [
  { name: 'home', color: '#999999', activeColor: '#07c160' },
  { name: 'solar', color: '#999999', activeColor: '#07c160' },
  { name: 'network', color: '#999999', activeColor: '#07c160' }
];

// 生成图标
icons.forEach(icon => {
  // 生成普通图标
  fs.writeFileSync(
    path.join(imagesDir, `${icon.name}.png`),
    createBase64PNG(icon.color)
  );
  
  // 生成激活状态图标
  fs.writeFileSync(
    path.join(imagesDir, `${icon.name}-active.png`),
    createBase64PNG(icon.activeColor)
  );
});

console.log('图标生成完成！'); 
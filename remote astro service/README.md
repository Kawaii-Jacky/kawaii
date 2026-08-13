# 羊牌自循环远程天文台作品集

这是一个由原生 HTML、CSS 和 JavaScript 构成的静态作品集，可直接部署到 GitHub Pages、Cloudflare Pages、对象存储或 Nginx。

## 目录结构

```text
.
├─ index.html
├─ architecture.html
├─ nodes.html
├─ process.html
├─ outcome.html
├─ future.html
└─ assets/
   ├─ css/
   ├─ js/
   └─ images/
```

## 本地预览

不要只依赖双击 HTML 检查页面。发布前可在当前目录运行：

```powershell
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000/
```

## GitHub Pages 发布

1. 新建一个公开 GitHub 仓库。
2. 将本目录中的文件上传到仓库根目录。
3. 打开仓库的 `Settings → Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/ (root)`。
6. 保存后等待 GitHub 生成 HTTPS 地址。

`.nojekyll` 用于关闭不需要的 Jekyll 处理，确保静态资源按原目录发布。

## 发布检查

- 六个分页均可直接访问。
- 页面内部链接使用相对路径。
- CSS、JavaScript 和图片都位于 `assets/`。
- 公开目录中不得包含 Wi-Fi 密码、设备 Token、摄像头账号或其他密钥。
- 如需绑定个人域名，可在 GitHub Pages 或 Cloudflare Pages 中配置自定义域名。


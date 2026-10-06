# 光学镜头模拟器

## 功能概览

这是一个基于 Three.js 和 Canvas 的交互式光学镜头模拟系统，包含：

### 1. 镜头结构与光路追踪（3D）
- **5片镜头组**：双凸透镜、弯月透镜、光圈、复合透镜系统
- **实时光线追踪**：可视化光线通过每片镜片的折射路径
- **3D 旋转视图**：自动旋转展示镜头立体结构
- **材质模拟**：透明玻璃材质、金属边框、物理光照

### 2. 像差分析
- **点列图（Spot Diagram）**：显示光线在像平面的会聚情况
- **球差（Spherical Aberration）**：不同高度光线聚焦偏差
- **慧差（Coma）**：离轴点的彗星状拖尾
- **像散（Astigmatism）**：径向和切向聚焦不一致

### 3. MTF 函数曲线
- **调制传递函数**：衡量镜头对不同空间频率的对比度传递能力
- **径向 vs 切向**：两个方向的分辨率表现
- **MTF50 指标**：50 lp/mm 处的对比度值
- **分辨率估算**：基于 MTF 的实际分辨率

## 交互控制

| 参数 | 范围 | 说明 |
|------|------|------|
| 焦距 | 20-200mm | 改变镜头焦距，影响整体光学倍率 |
| 光圈 | f/1.4-f/16 | 控制入瞳直径，影响景深和衍射 |
| 光线数量 | 5-21 | 追踪的光线数，越多计算越精确 |
| 视场角 | -20°至+20° | 离轴角度，观察像差随视场变化 |

## 光学原理

### 折射定律
```
n₁ sin(θ₁) = n₂ sin(θ₂)
```

每条光线在镜片表面遵循斯涅尔定律：
- `n₁`：入射介质折射率（空气≈1.0）
- `n₂`：折射介质折射率（玻璃 1.5-1.9）
- `θ₁`、`θ₂`：入射角和折射角

### MTF 计算模型
```
MTF(ν) = Aberration_effect(σ) × Diffraction_limit(ν/ν_cutoff)
```

- **像差效应**：`exp(-σ × 0.1)`，其中 σ 为球差值
- **衍射极限**：`1 / (1 + (ν/ν_c)²)`，ν_c = 1000/f_number

### 像差类型

1. **球差**：边缘光线比近轴光线聚焦更前/后
   - 计算：所有光线终点偏差的均值
   - 影响：整体对比度下降

2. **慧差**：离轴点成像呈彗星状
   - 计算：`coma = |field_angle| × spherical × 0.3`
   - 影响：边缘锐度损失

3. **像散**：不同方向聚焦位置不同
   - 计算：`astigmatism = (field_angle/20)² × 2.5`
   - 影响：点光源拉伸成线

## 技术栈

- **Three.js**（r128）：3D 镜头渲染和光路可视化
- **Canvas 2D API**：像差图表和 MTF 曲线绘制
- **原生 JavaScript**：光线追踪引擎和光学计算

## 使用方法

直接在浏览器中打开 `lens-optics-simulator.html`：

```bash
# 方法1：双击文件
lens-optics-simulator.html

# 方法2：本地服务器（推荐）
python -m http.server 8000
# 访问 http://localhost:8000/lens-optics-simulator.html
```

## 文件结构

```
光学/
├── lens-optics-simulator.html  # 完整的单文件应用
└── README.md                    # 本说明文档
```

## 扩展方向

- [ ] 色散模拟：不同波长的折射率差异（阿贝数）
- [ ] 畸变分析：枕形/桶形畸变可视化
- [ ] 真实镜头数据：导入 Zemax/Code V 格式
- [ ] PSF 分析：点扩散函数计算
- [ ] 景深预览：基于弥散圆的景深可视化
- [ ] 波前像差：泽尼克多项式展开

## 理论参考

- Eugene Hecht, *Optics* (5th ed.), Chapter 5: Geometrical Optics
- Warren J. Smith, *Modern Optical Engineering* (4th ed.)
- ISO 9334: Optics and photonics — Optical transfer function
- [MTF Curves Explained](https://www.opticalengineer.com/mtf-guide)

---

**制作时间**：2026-10-04  
**技术栈**：Three.js + Canvas + 原生 JS  
**许可**：MIT

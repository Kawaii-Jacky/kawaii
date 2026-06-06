> 本笔记基于对scRNA-seq标准分析流程图的深度解析，涵盖每张子图的原理、技术细节以及课堂问答的精炼总结。

![[7b8b21ca-bb36-40af-89c4-370150a56b21.png]]

## 📌 分析流程总览

本图展示了单细胞RNA测序数据分析的**6个核心步骤**，分为两行：

**第一行：数据预处理**

1. 质量控制（Quality Control）

1. 归一化（Normalization）

1. 特征选择（Feature Selection）

**第二行：降维与聚类**

1. 降维（Dimensionality Reduction / PCA）

1. 细胞间距离计算（Cell-cell Distances）

1. 无监督聚类（Unsupervised Clustering）

```jsx
原始测序数据
    ↓ 质量控制（剔除低质量细胞）
    ↓ 归一化（消除测序深度偏差）
    ↓ 特征选择（保留高变异基因）
    ↓ 降维PCA（压缩高维数据）
    ↓ 距离矩阵（量化细胞相似性）
    ↓ 无监督聚类（识别细胞亚群）
最终：细胞类型注释与生物学解读
```

> 这是目前 **Seurat / Scanpy** 等主流单细胞分析框架的标准分析范式。

---

## 📂 子页面索引

- 图1：质量控制（Quality Control）

- 图2：归一化（Normalization）

- 图3：特征选择（Feature Selection）

- 图4：降维（Dimensionality Reduction）

- 图5：细胞间距离热图（Cell-cell Distances）

- 图6：无监督聚类（Unsupervised Clustering）

[[📊 图1：质量控制 Quality Control]]

[[📏 图2：归一化 Normalization]]

[[🔬 图3：特征选择 Feature Selection]]

[[📉 图4+6：降维 & 无监督聚类]]

[[🔥 图5：细胞间距离热图 Cell-cell Distances]]

[[🎓 学习总结：核心思路与关键洗同]]
# PBMC 3k 单细胞标准流程复现

## 目标

从公开的 10x PBMC 3k 未归一化 UMI 计数矩阵出发，使用 Scanpy 完成：

```text
读取数据 → QC → 过滤 → 归一化 → HVG → 缩放 → PCA
        → kNN 图 → Leiden → UMAP → marker → 细胞注释
```

数据由脚本从 10x Genomics 官方地址下载。该数据使用早期 hg19 注释，约 2700 个过滤后 PBMC 条形码。

## 运行

```powershell
python -m uv sync
.\.venv\Scripts\python.exe .\analyze_pbmc3k.py
```

也可以按照输出图分四步运行：

```powershell
.\.venv\Scripts\python.exe .\step_01_data_qc.py
.\.venv\Scripts\python.exe .\step_02_normalization_hvg.py
.\.venv\Scripts\python.exe .\step_03_pca_clustering.py
.\.venv\Scripts\python.exe .\step_04_markers_annotation.py
```

| 脚本 | 输出图 | 中间对象 |
|---|---|---|
| `step_01_data_qc.py` | 01–02 QC图 | `01_qc_filtered.h5ad` |
| `step_02_normalization_hvg.py` | 03 HVG图 | `02_normalized_hvg.h5ad` |
| `step_03_pca_clustering.py` | 04–05 PCA/UMAP | `03_clustered.h5ad` |
| `step_04_markers_annotation.py` | 06–08 marker/注释 | 最终 `pbmc3k_processed.h5ad` |

`analyze_pbmc3k.py`仍然保留为一键完整流程。分步脚本通过`results/intermediate`中的对象衔接，适合逐段学习和调试。

参数集中在 `config.json`，随机种子和软件版本写入 `results/run_info.json`。

## 每一步为什么做

### 1. 读取原始 UMI 计数

输入是“基因 × 细胞”的稀疏整数矩阵。此时不同细胞的总 UMI 深度不同，不能直接比较表达量。

### 2. QC 指标

- `n_genes_by_counts`：每个细胞检测到的基因数。太低可能是空液滴或低质量细胞，异常高可能是 doublet。
- `total_counts`：每个细胞总 UMI。反映测序深度，也可能受细胞 RNA 含量影响。
- `pct_counts_mt`：线粒体转录本比例。较高常见于受损细胞，但阈值具有组织依赖性。

本项目使用经典教程阈值 `<2500 genes` 和 `<5% mitochondrial`，目的是复现，不应当把它当作所有组织的通用标准。

### 3. 过滤细胞和基因

去除信息太少或明显异常的细胞，并去除只在极少细胞中出现的基因。过滤太严格会删除稀有群体，太宽松则可能保留低质量细胞形成伪簇。

### 4. Library-size 归一化和 `log1p`

每个细胞缩放到总量 10,000，再计算 `log(1+x)`。这减弱测序深度和极高表达值的影响，但隐含“多数基因总体上不发生方向一致变化”等假设。

### 5. 高变基因 HVG

聚类不使用全部基因，而选择在考虑平均表达后仍表现出较大细胞间变异的基因。这样可以减少低信息基因造成的高维噪声。HVG 也可能选中批次、应激或细胞周期信号。

### 6. 回归与缩放

本项目按照经典 Scanpy 教程回归总 UMI 和线粒体比例，并将基因缩放到可比较尺度。回归不是必需步骤；如果技术变量和真实生物学状态相关，可能误删信号。

### 7. PCA

把数千个 HVG 压缩为少量互相正交的变化方向。前几个 PC 通常包含主要细胞类型信号；PC 太少会丢失群体，太多可能引入噪声。

### 8. kNN 图和 Leiden

在 PCA 空间中寻找每个细胞的近邻，构建细胞图；Leiden寻找连接紧密的图社区。它一定会给出划分，因此聚类结果需要结合稳定性、marker和外部证据解释。

### 9. UMAP

UMAP把邻接关系投影到二维，用于展示。岛屿的数量和距离不是正式统计证据，不能仅凭图形宣布新细胞类型。

### 10. Marker和注释

对每个计算簇寻找富集基因，再依据已知免疫细胞marker进行注释。常见marker包括：

| 细胞类型 | 参考 marker |
|---|---|
| CD4 T | IL7R、CCR7、LTB、CD3D |
| Cytotoxic T/NK | NKG7、GNLY；T细胞同时表达CD3D/CD3E |
| B | MS4A1、CD79A、CD37 |
| CD14 Mono | LYZ、S100A8、S100A9、LST1 |
| FCGR3A Mono | FCGR3A、LST1、LILRB1 |
| DC | FCER1A、CST3 |
| Platelet | PPBP、PF4 |

Marker 的普通 p 值会受到“先聚类、再用同一数据检验”的 double dipping 影响。本项目把它作为描述和教学工具，而不是独立证明簇真实的依据。

## 输出

```text
results/
├─ figures/                  # QC、HVG、PCA、UMAP和marker图
├─ tables/                   # marker、簇大小和粗粒度注释
├─ pbmc3k_processed.h5ad     # 可继续分析的对象
└─ run_info.json             # 软件版本、参数和细胞数
```

## 完成标准

复现完成后，应当能够回答：

1. 原始 count、归一化表达和缩放表达有什么区别？
2. 为什么 QC 阈值不能机械复制到其他组织？
3. 为什么聚类使用 HVG 和 PCA，而不直接使用全部基因？
4. 为什么 UMAP 不能证明簇真实？
5. 为什么细胞数不等于生物学重复数？
6. 为什么聚类后 marker p 值需要谨慎解释？

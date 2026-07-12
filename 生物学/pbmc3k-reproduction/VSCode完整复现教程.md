# 使用 VS Code 完整复现 PBMC 3k 单细胞分析

## 一、你最终要完成什么

本项目复现一条经典的单细胞 RNA 测序分析流程：

```text
10x 未归一化 UMI 计数矩阵
→ 数据读取与对象构建
→ 质量控制 QC
→ 过滤低质量细胞和低表达基因
→ Library-size 归一化与 log1p
→ 高变基因 HVG
→ 回归与缩放
→ PCA
→ kNN 细胞邻接图
→ Leiden 聚类
→ UMAP 展示
→ Marker 基因
→ 细胞类型注释
```

运行完成后会得到结果图、marker 表、细胞注释和可继续分析的 `h5ad` 对象。

## 二、数据来源

数据为 10x Genomics 官方 PBMC 3k 数据：

```text
https://cf.10xgenomics.com/samples/cell-exp/1.1.0/pbmc3k/
pbmc3k_filtered_gene_bc_matrices.tar.gz
```

PBMC 是外周血单个核细胞，主要包含：

- T 细胞；
- B 细胞；
- NK 细胞；
- 单核细胞；
- 树突细胞；
- 少量血小板。

脚本第一次运行时会自动下载并解压数据，不需要手工下载。下载后的原始文件位于：

```text
data/filtered_gene_bc_matrices/hg19/
├─ matrix.mtx
├─ genes.tsv
└─ barcodes.tsv
```

三个文件分别表示：

| 文件 | 含义 |
|---|---|
| `matrix.mtx` | 稀疏的基因 × 细胞 UMI 矩阵 |
| `genes.tsv` | 基因 ID 与基因符号 |
| `barcodes.tsv` | 每个细胞液滴的条形码 |

这里的 filtered matrix 表示已经经过 10x Cell Ranger 的基础细胞条形码识别，但没有进行下游归一化、HVG、PCA和聚类。

## 三、在 VS Code 中打开项目

### 1. 安装 VS Code 扩展

打开 VS Code 左侧扩展页面，安装：

- `Python`，发布者 Microsoft；
- `Python Debugger`，发布者 Microsoft；
- `Jupyter`，可选，用于以后运行 Notebook。

### 2. 打开正确的文件夹

在 VS Code 中选择：

```text
文件 → 打开文件夹
```

选择：

```text
C:\Users\Administrator\Desktop\h2o\obsidian\生物学\pbmc3k-reproduction
```

不要只打开单个 `analyze_pbmc3k.py`，因为脚本使用项目相对路径保存数据和结果。

### 3. 选择 Python 环境

按：

```text
Ctrl + Shift + P
```

输入并选择：

```text
Python: Select Interpreter
```

选择：

```text
.venv\Scripts\python.exe
```

项目已经包含可运行的 Python 3.11 环境。VS Code 配置也已默认指向该环境。

在 VS Code 中打开终端：

```text
终端 → 新建终端
```

验证环境：

```powershell
python --version
python -c "import scanpy; print(scanpy.__version__)"
```

预期看到 Python 3.11 和 Scanpy 1.11.5。

## 四、如果需要重新创建环境

如果 `.venv` 被删除或复制到另一台电脑，先安装 `uv`：

```powershell
python -m pip install --user uv
```

在项目目录执行：

```powershell
python -m uv sync --python 3.11
```

`uv`会读取 `pyproject.toml` 和 `uv.lock`，安装与本次复现一致的依赖。

不要把 `.venv` 当作科研结果备份。真正决定环境的是：

- `pyproject.toml`；
- `uv.lock`；
- `results/run_info.json`。

## 五、运行完整流程

### 方法一：终端运行

```powershell
.\.venv\Scripts\python.exe .\analyze_pbmc3k.py
```

### 方法二：VS Code 按 F5

1. 打开 `analyze_pbmc3k.py`；
2. 按 `F5`；
3. 选择“运行 PBMC 3k 完整流程”。

`.vscode/launch.json` 已经把工作目录固定为项目根目录。

第一次运行包括下载，之后会使用本地缓存。当前电脑完整分析通常约 1 分钟，邻接图计算是主要耗时步骤。

## 六、逐步理解分析代码

### 1. 读取原始计数

脚本读取 Matrix Market 矩阵，并转置为 Scanpy 约定的：

```text
行 = 细胞
列 = 基因
```

本次初始对象为：

```text
2700 cells × 32738 genes
```

矩阵必须保持稀疏格式，否则同样的数据会占用更多内存。

### 2. 计算 QC 指标

主要指标：

| 指标 | 含义 | 异常解释 |
|---|---|---|
| `n_genes_by_counts` | 每个细胞检测到的基因数 | 太低可能是空液滴，异常高可能是 doublet |
| `total_counts` | 每个细胞总 UMI | 反映深度，也受细胞 RNA 含量影响 |
| `pct_counts_mt` | 线粒体 UMI 比例 | 较高常见于受损细胞 |

输出：

```text
results/figures/01_qc_before_filtering.png
results/figures/02_qc_relationships.png
```

### 3. 过滤

当前参数：

```json
{
  "min_genes_per_cell": 200,
  "min_cells_per_gene": 3,
  "max_genes_per_cell": 2500,
  "max_mito_percent": 5.0
}
```

过滤后保留 2638 个细胞。

这些是经典 PBMC 3k 教学参数，不是所有组织的通用标准。肿瘤、心肌、单核测序和低深度数据需要重新观察分布后决定。

### 4. 归一化

每个细胞被缩放到总表达 10000：

\[
x'_{ig}=\frac{x_{ig}}{\sum_gx_{ig}}\times10000
\]

之后计算：

\[
\log(1+x'_{ig})
\]

目的：减弱测序深度和极高表达基因的影响，使细胞之间更容易比较。

局限：总体 RNA 含量可能具有真实生物学差异，因此归一化不是“恢复绝对表达真值”。

### 5. 高变基因

脚本根据均值—离散度关系选择 HVG。本次得到 1838 个基因。

输出：

```text
results/figures/03_highly_variable_genes.png
```

为什么不使用全部基因：低表达和低变异基因会增加高维噪声，使细胞距离不稳定。

为什么也有风险：HVG可能主要反映批次、应激、细胞周期或技术差异。

### 6. 保存 `adata.raw`

脚本在缩放之前执行：

```python
adata.raw = adata
```

它保存归一化且 `log1p` 后的全基因表达，用于marker展示。后续PCA对象只保留HVG。

### 7. 回归和缩放

复现经典Scanpy教程时，回归：

- `total_counts`；
- `pct_counts_mt`。

随后将不同基因缩放到可比较尺度，并把极端值截断到10。

注意：回归不是必做步骤。如果线粒体活动或RNA含量本身与研究状态有关，回归可能删除真实信号。

### 8. PCA

PCA将1838个HVG压缩为40个主成分：

```text
2638 × 1838
→ 2638 × 40
```

输出：

```text
results/figures/04_pca_variance_ratio.png
```

PC太少会漏掉弱群体，太多可能带入噪声。这也是后续最适合亲自改变的参数之一。

### 9. kNN图

根据PCA距离，为每个细胞寻找10个近邻，形成细胞图：

```text
细胞 = 节点
近邻关系 = 边
```

Leiden并不是直接在UMAP二维坐标上聚类，而是在这个高维邻接图上寻找连接紧密的社区。

### 10. Leiden聚类

当前参数：

```json
{
  "n_neighbors": 10,
  "clustering_pcs": 40,
  "leiden_resolution": 0.5
}
```

本次得到6个粗粒度簇。Leiden一定会输出分区，resolution越高通常簇越多，但更多簇不代表更接近真实生物学。

### 11. UMAP

输出：

```text
results/figures/05_umap_clusters_and_qc.png
```

该图同时按以下变量着色：

- Leiden簇；
- 总UMI；
- 线粒体比例。

这样可以检查某个簇是否主要由低质量或测序深度驱动。

UMAP用于展示，不是簇真实性检验。二维岛屿之间的视觉距离不能直接解释为精确的生物学距离。

### 12. Marker基因

脚本使用Wilcoxon方法比较每个簇与其他细胞，输出：

```text
results/tables/cluster_markers_all.csv
results/tables/cluster_markers_top20.csv
results/figures/06_cluster_marker_rankings.png
results/figures/07_marker_dotplot.png
```

DotPlot中：

- 点大小表示簇中表达该基因的细胞比例；
- 颜色表示簇中的平均表达强度。

聚类与marker使用了同一份数据，p值可能受到double dipping影响。本流程主要用marker进行描述和教学注释。

### 13. 细胞类型注释

本次粗注释：

| Leiden | 细胞类型 | 主要marker |
|---:|---|---|
| 0 | T cells | CD3D、LTB、IL7R、CCR7 |
| 1 | B cells | MS4A1、CD79A、CD79B |
| 2 | Monocytes | LYZ、LST1、S100A8 |
| 3 | Dendritic cells | FCER1A、CST3、HLA-DRA |
| 4 | Cytotoxic T / NK | NKG7、GNLY、CCL5 |
| 5 | Platelets | PPBP、PF4 |

最终图：

```text
results/figures/08_umap_cell_types.png
```

当前分辨率没有强行拆开CD14/FCGR3A单核细胞和细胞毒性T/NK，因此使用诚实的粗粒度标签。

## 七、结果文件怎么查看

### PNG图

在VS Code文件树中展开：

```text
results/figures
```

点击PNG即可预览。

### CSV表

展开：

```text
results/tables
```

可以使用VS Code的Rainbow CSV扩展，也可以用Excel打开。

### h5ad对象

```text
results/pbmc3k_processed.h5ad
```

重新读取：

```python
import scanpy as sc

adata = sc.read_h5ad("results/pbmc3k_processed.h5ad")
print(adata)
print(adata.obs[["leiden", "cell_type"]].head())
```

### 运行记录

```text
results/run_info.json
```

记录软件版本、参数以及过滤前后细胞和基因数量，是可复现性的重要组成部分。

## 八、亲自完成三个复现实验

所有参数位于 `config.json`，修改后重新按F5运行。

### 实验一：PC数量

分别设置：

```json
"clustering_pcs": 10
```

```json
"clustering_pcs": 20
```

```json
"clustering_pcs": 40
```

比较簇数量、marker和UMAP。每次运行前把旧`results`复制到不同名称，避免覆盖。

### 实验二：Leiden resolution

比较：

```text
0.3、0.5、0.8
```

观察T/NK和单核群体是否被进一步拆开，并检查新簇是否有明确marker支持。

### 实验三：不回归技术变量

在脚本中临时注释：

```python
sc.pp.regress_out(adata, ["total_counts", "pct_counts_mt"])
```

比较PCA、UMAP和marker，理解回归不是机械必选项。

## 九、进入真实研究前需要补充什么

PBMC 3k是单样本教学数据。真实研究还可能需要：

- empty droplet检测；
- doublet检测；
- 环境RNA校正；
- 多供体和多批次整合；
- 供体级pseudobulk差异表达；
- 聚类稳定性和显著性评价；
- 独立数据或蛋白/空间证据验证。

尤其要记住：一个供体有10万个细胞，生物学样本量仍然是1。

## 十、除了空间转录组，单细胞有哪些研究方向

### 生物学应用

- 细胞图谱与新细胞状态识别；
- 肿瘤微环境和免疫细胞异质性；
- 发育、分化和拟时序轨迹；
- 疾病与对照的细胞类型特异差异表达；
- 免疫受体TCR/BCR克隆分析；
- 药物处理和CRISPR扰动单细胞分析；
- 可变剪接与长读长单细胞测序；
- 等位基因特异性表达和印记基因；
- 细胞通讯和调控网络；
- 单细胞多组学，如RNA+ATAC、RNA+蛋白。

### 计算方法

- QC、归一化和特征选择；
- 批次校正与数据整合；
- 聚类有效性和稀有群体检测；
- 自动细胞类型注释；
- 轨迹推断与RNA velocity；
- 差异表达和供体级统计模型；
- 单细胞基础模型与表征学习；
- 数据模拟、benchmark和可复现工作流。

对当前学习阶段，最合适的顺序是：先掌握标准scRNA-seq流程，再选择批次整合、轨迹、肿瘤免疫或空间解卷积中的一个方向深入。

## 十一、复现完成的判断标准

只有“代码运行成功”还不够。你应该能够解释：

1. 原始UMI、归一化表达和缩放值有什么区别；
2. 为什么QC阈值不能复制到所有组织；
3. 为什么使用HVG和PCA；
4. kNN图与Leiden是什么关系；
5. 为什么UMAP不能证明簇真实；
6. marker如何支持细胞注释；
7. 为什么细胞数不等于生物学重复数；
8. 哪些默认参数最可能改变最终结论。

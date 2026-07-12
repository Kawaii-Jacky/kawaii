"""Step 1: download/read counts, calculate QC metrics, filter cells and genes."""

import json 

import scanpy as sc 

from analyze_pbmc3k import (  # 导入analyze_pbmc3k.py文件中的内容
    CONFIG_PATH,
    FIGURES_DIR,
    RESULTS_DIR,
    download_data,
    read_legacy_10x,
    save_figure,
)


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))  # 路径读取为文本格式，再解析为python字典
    intermediate = RESULTS_DIR / "intermediate"  # 路径
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)  # 创建文件夹
    intermediate.mkdir(parents=True, exist_ok=True)  # 创建文件夹

    adata = read_legacy_10x(download_data())  # 下载数据
    adata.uns["initial_shape"] = list(adata.shape)  #  记录初始形状
    adata.var["mt"] = adata.var_names.str.startswith("MT-")  # 标记mt基因
    sc.pp.calculate_qc_metrics(
        adata, qc_vars=["mt"], percent_top=None, log1p=False, inplace=True  # 计算qc指标
    )

    sc.pl.violin(
        adata,
        ["n_genes_by_counts", "total_counts", "pct_counts_mt"],
        jitter=0.35,
        multi_panel=True,
        show=False, # 不显示图片，只是为了生成图片
    )
    save_figure("01_qc_before_filtering.png") # 保存图片

    sc.pl.scatter(
        adata, x="total_counts", y="n_genes_by_counts", color="pct_counts_mt", show=False # 散点图
    )
    save_figure("02_qc_relationships.png") # 保存图片

    sc.pp.filter_cells(adata, min_genes=config["min_genes_per_cell"]) # 过滤细胞
    sc.pp.filter_genes(adata, min_cells=config["min_cells_per_gene"]) # 过滤基因
    adata = adata[
        (adata.obs["n_genes_by_counts"] < config["max_genes_per_cell"]) # 过滤细胞和基因
        & (adata.obs["pct_counts_mt"] < config["max_mito_percent"]) # 过滤细胞和基因
    ].copy() # 复制一份数据，避免修改原始数据
    adata.write_h5ad(intermediate / "01_qc_filtered.h5ad", compression="gzip") # 保存数据
    print(f"Step 1 complete: {adata.n_obs} cells x {adata.n_vars} genes") # 打印完成信息


if __name__ == "__main__":
    main()


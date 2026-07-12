"""Step 2: normalize counts, log transform, select highly variable genes."""

import json

import scanpy as sc

from analyze_pbmc3k import CONFIG_PATH, FIGURES_DIR, RESULTS_DIR, save_figure


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    intermediate = RESULTS_DIR / "intermediate"
    input_path = intermediate / "01_qc_filtered.h5ad"
    if not input_path.exists():
        raise FileNotFoundError("请先运行 step_01_data_qc.py")

    adata = sc.read_h5ad(input_path)
    sc.pp.normalize_total(adata, target_sum=config["target_sum"])
    sc.pp.log1p(adata)
    sc.pp.highly_variable_genes(
        adata,
        min_mean=config["hvg_min_mean"],
        max_mean=config["hvg_max_mean"],
        min_disp=config["hvg_min_disp"],
    )
    sc.pl.highly_variable_genes(adata, show=False)
    save_figure("03_highly_variable_genes.png")

    adata.raw = adata
    adata = adata[:, adata.var["highly_variable"]].copy()
    adata.write_h5ad(intermediate / "02_normalized_hvg.h5ad", compression="gzip")
    print(f"Step 2 complete: retained {adata.n_vars} highly variable genes")


if __name__ == "__main__":
    main()


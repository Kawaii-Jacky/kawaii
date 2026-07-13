"""Step 1: download/read counts, calculate QC metrics, filter cells and genes."""

import json

import scanpy as sc

from analyze_pbmc3k import (
    CONFIG_PATH,
    FIGURES_DIR,
    RESULTS_DIR,
    download_data,
    read_legacy_10x,
    save_figure,
)


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    intermediate = RESULTS_DIR / "intermediate"
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    intermediate.mkdir(parents=True, exist_ok=True)

    adata = read_legacy_10x(download_data())
    adata.uns["initial_shape"] = list(adata.shape)
    adata.var["mt"] = adata.var_names.str.startswith("MT-")
    sc.pp.calculate_qc_metrics(
        adata, qc_vars=["mt"], percent_top=None, log1p=False, inplace=True
    )

    sc.pl.violin(
        adata,
        ["n_genes_by_counts", "total_counts", "pct_counts_mt"],
        jitter=0.35,
        multi_panel=True,
        show=False,
    )
    save_figure("01_qc_before_filtering.png")

    sc.pl.scatter(
        adata, x="total_counts", y="n_genes_by_counts", color="pct_counts_mt", show=False
    )
    save_figure("02_qc_relationships.png")

    sc.pp.filter_cells(adata, min_genes=config["min_genes_per_cell"])
    sc.pp.filter_genes(adata, min_cells=config["min_cells_per_gene"])
    adata = adata[
        (adata.obs["n_genes_by_counts"] < config["max_genes_per_cell"])
        & (adata.obs["pct_counts_mt"] < config["max_mito_percent"])
    ].copy()
    adata.write_h5ad(intermediate / "01_qc_filtered.h5ad", compression="gzip")
    print(f"Step 1 complete: {adata.n_obs} cells x {adata.n_vars} genes")


if __name__ == "__main__":
    main()


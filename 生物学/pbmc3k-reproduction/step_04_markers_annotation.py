"""Step 4: marker testing, marker plots, coarse annotation and final outputs."""

import json
import platform
from importlib.metadata import version

import numpy as np
import pandas as pd
import scanpy as sc

from analyze_pbmc3k import CONFIG_PATH, RESULTS_DIR, TABLES_DIR, save_figure


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    intermediate = RESULTS_DIR / "intermediate"
    input_path = intermediate / "03_clustered.h5ad"
    if not input_path.exists():
        raise FileNotFoundError("请先运行 step_03_pca_clustering.py")

    TABLES_DIR.mkdir(parents=True, exist_ok=True)
    adata = sc.read_h5ad(input_path)
    sc.tl.rank_genes_groups(adata, "leiden", method="wilcoxon", use_raw=True)
    markers = sc.get.rank_genes_groups_df(adata, group=None)
    markers.to_csv(TABLES_DIR / "cluster_markers_all.csv", index=False)
    markers.groupby("group", observed=True).head(20).to_csv(
        TABLES_DIR / "cluster_markers_top20.csv", index=False
    )
    sc.pl.rank_genes_groups(adata, n_genes=20, sharey=False, show=False)
    save_figure("06_cluster_marker_rankings.png")

    marker_panel = [
        "IL7R", "CCR7", "CD3D", "LTB", "NKG7", "GNLY", "MS4A1", "CD79A",
        "LYZ", "S100A8", "FCGR3A", "LST1", "FCER1A", "CST3", "PPBP", "PF4",
    ]
    marker_panel = [gene for gene in marker_panel if gene in adata.raw.var_names]
    sc.pl.dotplot(adata, marker_panel, groupby="leiden", use_raw=True, show=False)
    save_figure("07_marker_dotplot.png")

    cluster_annotation = {
        "0": "T cells",
        "1": "B cells",
        "2": "Monocytes",
        "3": "Dendritic cells",
        "4": "Cytotoxic T / NK",
        "5": "Platelets",
    }
    adata.obs["cell_type"] = adata.obs["leiden"].map(cluster_annotation).astype("category")
    pd.DataFrame(
        {"leiden": cluster_annotation.keys(), "cell_type": cluster_annotation.values()}
    ).to_csv(TABLES_DIR / "cluster_annotations.csv", index=False)
    sc.pl.umap(adata, color="cell_type", legend_loc="on data", legend_fontsize=8, show=False)
    save_figure("08_umap_cell_types.png")

    cluster_sizes = adata.obs["leiden"].value_counts().sort_index()
    cluster_sizes.rename("n_cells").to_csv(TABLES_DIR / "cluster_sizes.csv")
    adata.write_h5ad(RESULTS_DIR / "pbmc3k_processed.h5ad", compression="gzip")

    initial_shape = adata.uns.get("initial_shape", [2700, 32738])
    run_info = {
        "python": platform.python_version(),
        "scanpy": version("scanpy"),
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "initial_cells": int(initial_shape[0]),
        "initial_genes": int(initial_shape[1]),
        "final_cells": adata.n_obs,
        "final_hvgs": adata.n_vars,
        "config": config,
    }
    (RESULTS_DIR / "run_info.json").write_text(
        json.dumps(run_info, indent=2, ensure_ascii=True), encoding="utf-8"
    )
    print("Step 4 complete. Final annotations:")
    print(adata.obs[["leiden", "cell_type"]].value_counts().sort_index())


if __name__ == "__main__":
    main()


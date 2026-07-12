"""Step 3: regress/scale, PCA, neighbor graph, UMAP and Leiden clustering."""

import json

import numpy as np
import scanpy as sc

from analyze_pbmc3k import CONFIG_PATH, RESULTS_DIR, save_figure


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    intermediate = RESULTS_DIR / "intermediate"
    input_path = intermediate / "02_normalized_hvg.h5ad"
    if not input_path.exists():
        raise FileNotFoundError("请先运行 step_02_normalization_hvg.py")

    np.random.seed(config["random_seed"])
    adata = sc.read_h5ad(input_path)
    sc.pp.regress_out(adata, ["total_counts", "pct_counts_mt"])
    sc.pp.scale(adata, max_value=10)
    sc.tl.pca(
        adata,
        n_comps=config["n_pcs"],
        svd_solver="arpack",
        random_state=config["random_seed"],
    )
    sc.pl.pca_variance_ratio(adata, log=True, n_pcs=config["n_pcs"], show=False)
    save_figure("04_pca_variance_ratio.png")

    sc.pp.neighbors(
        adata,
        n_neighbors=config["n_neighbors"],
        n_pcs=config["clustering_pcs"],
        random_state=config["random_seed"],
    )
    sc.tl.umap(adata, random_state=config["random_seed"])
    sc.tl.leiden(
        adata,
        resolution=config["leiden_resolution"],
        random_state=config["random_seed"],
        key_added="leiden",
        flavor="igraph",
        n_iterations=2,
        directed=False,
    )
    sc.pl.umap(adata, color=["leiden", "total_counts", "pct_counts_mt"], show=False)
    save_figure("05_umap_clusters_and_qc.png")

    adata.write_h5ad(intermediate / "03_clustered.h5ad", compression="gzip")
    print("Step 3 complete. Cluster sizes:")
    print(adata.obs["leiden"].value_counts().sort_index())


if __name__ == "__main__":
    main()


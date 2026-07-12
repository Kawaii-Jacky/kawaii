from __future__ import annotations

import json
import platform
import tarfile
import urllib.request
from importlib.metadata import version
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import anndata as ad
import numpy as np
import pandas as pd
import scanpy as sc
from anndata.utils import make_index_unique
from scipy.io import mmread


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
RESULTS_DIR = ROOT / "results"
FIGURES_DIR = RESULTS_DIR / "figures"
TABLES_DIR = RESULTS_DIR / "tables"
CONFIG_PATH = ROOT / "config.json"
DATA_URL = (
    "https://cf.10xgenomics.com/samples/cell-exp/1.1.0/pbmc3k/"
    "pbmc3k_filtered_gene_bc_matrices.tar.gz"
)


def download_data() -> Path:
    matrix_dir = DATA_DIR / "filtered_gene_bc_matrices" / "hg19"
    if matrix_dir.exists():
        return matrix_dir

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    archive = DATA_DIR / "pbmc3k_filtered_gene_bc_matrices.tar.gz"
    if not archive.exists():
        print(f"Downloading {DATA_URL}")
        request = urllib.request.Request(
            DATA_URL,
            headers={"User-Agent": "Mozilla/5.0 pbmc3k-reproduction/0.1"},
        )
        with urllib.request.urlopen(request) as response, archive.open("wb") as output:
            output.write(response.read())

    print(f"Extracting {archive.name}")
    with tarfile.open(archive, "r:gz") as handle:
        handle.extractall(DATA_DIR, filter="data")
    return matrix_dir


def save_figure(filename: str) -> None:
    plt.savefig(FIGURES_DIR / filename, dpi=180, bbox_inches="tight")
    plt.close("all")


def read_legacy_10x(matrix_dir: Path) -> ad.AnnData:
    """Read the legacy 10x MTX through a stream for Windows Unicode paths."""
    with (matrix_dir / "matrix.mtx").open("rb") as matrix_file:
        matrix = mmread(matrix_file).T.tocsr()
    genes = pd.read_csv(matrix_dir / "genes.tsv", sep="\t", header=None)
    barcodes = pd.read_csv(matrix_dir / "barcodes.tsv", sep="\t", header=None)
    gene_names = make_index_unique(
        pd.Index(genes.iloc[:, 1].astype(str), name="gene_symbol")
    )
    cell_names = pd.Index(barcodes.iloc[:, 0].astype(str), name="barcode")
    adata = ad.AnnData(
        X=matrix,
        obs=pd.DataFrame(index=cell_names),
        var=pd.DataFrame(
            {"gene_ids": genes.iloc[:, 0].astype(str).to_numpy()},
            index=gene_names,
        ),
    )
    return adata


def write_run_info(config: dict, initial_shape: tuple[int, int], final_shape: tuple[int, int]) -> None:
    info = {
        "python": platform.python_version(),
        "scanpy": version("scanpy"),
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "initial_cells": initial_shape[0],
        "initial_genes": initial_shape[1],
        "final_cells": final_shape[0],
        "final_genes": final_shape[1],
        "config": config,
    }
    (RESULTS_DIR / "run_info.json").write_text(
        json.dumps(info, indent=2, ensure_ascii=True), encoding="utf-8"
    )


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    np.random.seed(config["random_seed"])
    sc.settings.verbosity = 2
    sc.settings.set_figure_params(dpi=100, facecolor="white", frameon=False)

    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    matrix_dir = download_data()
    adata = read_legacy_10x(matrix_dir)
    initial_shape = adata.shape

    # QC annotations are calculated on raw UMI counts.
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

    # Library-size normalization and log1p make cells more comparable.
    sc.pp.normalize_total(adata, target_sum=config["target_sum"])
    sc.pp.log1p(adata)

    # HVGs carry more cell-to-cell information than the full gene set.
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

    # Regressing technical covariates reproduces the classic Scanpy tutorial.
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

    sc.tl.rank_genes_groups(adata, "leiden", method="wilcoxon", use_raw=True)
    markers = sc.get.rank_genes_groups_df(adata, group=None)
    markers.to_csv(TABLES_DIR / "cluster_markers_all.csv", index=False)
    markers.groupby("group", observed=True).head(20).to_csv(
        TABLES_DIR / "cluster_markers_top20.csv", index=False
    )

    sc.pl.rank_genes_groups(adata, n_genes=20, sharey=False, show=False)
    save_figure("06_cluster_marker_rankings.png")

    marker_panel = [
        "IL7R",
        "CCR7",
        "CD3D",
        "LTB",
        "NKG7",
        "GNLY",
        "MS4A1",
        "CD79A",
        "LYZ",
        "S100A8",
        "FCGR3A",
        "LST1",
        "FCER1A",
        "CST3",
        "PPBP",
        "PF4",
    ]
    marker_panel = [gene for gene in marker_panel if gene in adata.raw.var_names]
    sc.pl.dotplot(adata, marker_panel, groupby="leiden", use_raw=True, show=False)
    save_figure("07_marker_dotplot.png")

    # Coarse labels are assigned only after inspecting the marker evidence.
    cluster_annotation = {
        "0": "T cells",
        "1": "B cells",
        "2": "Monocytes",
        "3": "Dendritic cells",
        "4": "Cytotoxic T / NK",
        "5": "Platelets",
    }
    adata.obs["cell_type"] = (
        adata.obs["leiden"].map(cluster_annotation).astype("category")
    )
    annotation_table = pd.DataFrame(
        {
            "leiden": list(cluster_annotation),
            "cell_type": list(cluster_annotation.values()),
        }
    )
    annotation_table.to_csv(TABLES_DIR / "cluster_annotations.csv", index=False)
    sc.pl.umap(adata, color="cell_type", legend_loc="on data", legend_fontsize=8, show=False)
    save_figure("08_umap_cell_types.png")

    cluster_sizes = adata.obs["leiden"].value_counts().sort_index()
    cluster_sizes.rename("n_cells").to_csv(TABLES_DIR / "cluster_sizes.csv")
    adata.write_h5ad(RESULTS_DIR / "pbmc3k_processed.h5ad", compression="gzip")
    write_run_info(config, initial_shape, adata.shape)
    print(cluster_sizes)
    print(f"Results written to {RESULTS_DIR}")


if __name__ == "__main__":
    main()

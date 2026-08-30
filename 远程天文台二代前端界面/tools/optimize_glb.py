#!/usr/bin/env python3
"""Create a WebP-textured GLB optimized for ASTRA's small 3D dashboard stage."""

from __future__ import annotations

import argparse
import io
import json
import struct
from pathlib import Path

from PIL import Image

GLB_MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def pad(data: bytes, fill: bytes) -> bytes:
    return data + fill * ((-len(data)) % 4)


def image_slots(document: dict) -> set[int]:
    """Return images used by normal or scalar-data maps, kept lossless."""
    protected_textures: set[int] = set()
    for material in document.get("materials", []):
        for key in ("normalTexture", "occlusionTexture", "metallicRoughnessTexture"):
            if key in material:
                protected_textures.add(material[key]["index"])
        clearcoat = material.get("extensions", {}).get("KHR_materials_clearcoat", {})
        for key in ("clearcoatTexture", "clearcoatRoughnessTexture", "clearcoatNormalTexture"):
            if key in clearcoat:
                protected_textures.add(clearcoat[key]["index"])

    protected_images: set[int] = set()
    for texture_index in protected_textures:
        texture = document.get("textures", [])[texture_index]
        if "source" in texture:
            protected_images.add(texture["source"])
    return protected_images


def read_glb(path: Path) -> tuple[dict, bytes]:
    raw = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<III", raw, 0)
    if magic != GLB_MAGIC or version != 2 or total_length != len(raw):
        raise ValueError("Input is not a valid glTF 2.0 binary file")

    offset = 12
    document = None
    binary = None
    while offset < len(raw):
        length, chunk_type = struct.unpack_from("<II", raw, offset)
        offset += 8
        chunk = raw[offset : offset + length]
        offset += length
        if chunk_type == JSON_CHUNK:
            document = json.loads(chunk.rstrip(b" \t\r\n\0").decode("utf-8"))
        elif chunk_type == BIN_CHUNK:
            binary = chunk
    if document is None or binary is None:
        raise ValueError("GLB must contain JSON and BIN chunks")
    return document, binary


def make_webp(source: bytes, lossless: bool, max_size: int) -> bytes:
    with Image.open(io.BytesIO(source)) as image:
        image.load()
        if max(image.size) > max_size:
            scale = max_size / max(image.size)
            size = (round(image.width * scale), round(image.height * scale))
            image = image.resize(size, Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        output = io.BytesIO()
        image.save(
            output,
            format="WEBP",
            lossless=lossless,
            quality=82 if not lossless else 100,
            method=6,
            exact=True,
        )
        return output.getvalue()


def optimize(input_path: Path, output_path: Path, max_size: int) -> tuple[int, int]:
    document, binary = read_glb(input_path)
    protected_images = image_slots(document)
    images_by_view = {image.get("bufferView"): index for index, image in enumerate(document.get("images", []))}
    replacement: dict[int, bytes] = {}

    for view_index, image_index in images_by_view.items():
        if view_index is None:
            continue
        view = document["bufferViews"][view_index]
        start = view.get("byteOffset", 0)
        encoded = binary[start : start + view["byteLength"]]
        replacement[view_index] = make_webp(encoded, image_index in protected_images, max_size)
        document["images"][image_index]["mimeType"] = "image/webp"

    rebuilt = bytearray()
    for index, view in enumerate(document.get("bufferViews", [])):
        start = view.get("byteOffset", 0)
        content = replacement.get(index, binary[start : start + view["byteLength"]])
        while len(rebuilt) % 4:
            rebuilt.append(0)
        view["byteOffset"] = len(rebuilt)
        view["byteLength"] = len(content)
        rebuilt.extend(content)

    for texture in document.get("textures", []):
        source = texture.pop("source", None)
        if source is None:
            continue
        texture.setdefault("extensions", {})["EXT_texture_webp"] = {"source": source}

    for extension_list in ("extensionsUsed", "extensionsRequired"):
        extensions = document.setdefault(extension_list, [])
        if "EXT_texture_webp" not in extensions:
            extensions.append("EXT_texture_webp")

    document["buffers"][0]["byteLength"] = len(rebuilt)
    json_chunk = pad(json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad(bytes(rebuilt), b"\0")
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    output = struct.pack("<III", GLB_MAGIC, 2, total)
    output += struct.pack("<II", len(json_chunk), JSON_CHUNK) + json_chunk
    output += struct.pack("<II", len(bin_chunk), BIN_CHUNK) + bin_chunk
    output_path.write_bytes(output)
    return input_path.stat().st_size, output_path.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--max-size", type=int, default=256)
    args = parser.parse_args()
    before, after = optimize(args.input, args.output, args.max_size)
    print(f"{before} -> {after} bytes ({after / before:.1%})")


if __name__ == "__main__":
    main()

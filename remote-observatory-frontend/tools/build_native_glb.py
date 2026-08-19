#!/usr/bin/env python3
"""Build a Tauri-safe GLB whose visible color maps are external PNG files."""

from __future__ import annotations

import argparse
import json
import re
import struct
from pathlib import Path

GLB_MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def pad(data: bytes, fill: bytes) -> bytes:
    return data + fill * ((-len(data)) % 4)


def read_glb(path: Path) -> tuple[dict, bytes]:
    raw = path.read_bytes()
    magic, version, total = struct.unpack_from("<III", raw, 0)
    if magic != GLB_MAGIC or version != 2 or total != len(raw):
        raise ValueError("Input is not a valid glTF 2.0 binary file")
    offset = 12
    document = None
    binary = None
    while offset < len(raw):
        length, kind = struct.unpack_from("<II", raw, offset)
        offset += 8
        chunk = raw[offset : offset + length]
        offset += length
        if kind == JSON_CHUNK:
            document = json.loads(chunk.rstrip(b" \t\r\n\0").decode("utf-8"))
        elif kind == BIN_CHUNK:
            binary = chunk
    if document is None or binary is None:
        raise ValueError("GLB must contain JSON and BIN chunks")
    return document, binary


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "material"


def build(input_path: Path, output_path: Path) -> list[Path]:
    document, binary = read_glb(input_path)
    texture_dir_name = f"{output_path.stem}-textures"
    texture_dir = output_path.parent / texture_dir_name
    texture_dir.mkdir(parents=True, exist_ok=True)

    exported: list[Path] = []
    exported_images: set[int] = set()
    for material_index, material in enumerate(document.get("materials", [])):
        base_map = material.get("pbrMetallicRoughness", {}).get("baseColorTexture")
        if not base_map:
            continue
        texture = document["textures"][base_map["index"]]
        image_index = texture.get("source")
        if image_index is None or image_index in exported_images:
            continue
        image = document["images"][image_index]
        if image.get("mimeType") != "image/png" or "bufferView" not in image:
            raise ValueError(f"Base color image {image_index} is not an embedded PNG")
        view = document["bufferViews"][image["bufferView"]]
        start = view.get("byteOffset", 0)
        content = binary[start : start + view["byteLength"]]
        filename = f"{material_index:02d}-{safe_name(material.get('name', 'material'))}.png"
        target = texture_dir / filename
        target.write_bytes(content)
        exported.append(target)
        exported_images.add(image_index)
        image.clear()
        image["name"] = f"Native_{material.get('name', material_index)}"
        image["uri"] = f"{texture_dir_name}/{filename}"

    if len(exported) < 5:
        raise ValueError(f"Expected at least five visible color maps, found {len(exported)}")

    json_chunk = pad(json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad(binary, b"\0")
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    output = struct.pack("<III", GLB_MAGIC, 2, total)
    output += struct.pack("<II", len(json_chunk), JSON_CHUNK) + json_chunk
    output += struct.pack("<II", len(bin_chunk), BIN_CHUNK) + bin_chunk
    output_path.write_bytes(output)
    return exported


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    exported = build(args.input, args.output)
    print(f"{args.output}: {len(exported)} external PNG color maps")


if __name__ == "__main__":
    main()

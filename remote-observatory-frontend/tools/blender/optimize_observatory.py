import bpy
import json
import sys
from pathlib import Path


def arg(flag: str, default=None):
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if flag not in args:
        if default is not None:
            return default
        raise SystemExit(f"Missing required argument: {flag}")
    return args[args.index(flag) + 1]


source = Path(arg("--input")).resolve()
output = Path(arg("--output")).resolve()
blend_output = Path(arg("--blend-output", str(output.with_suffix(".blend")))).resolve()
max_texture = int(arg("--max-texture", "1024"))
output.parent.mkdir(parents=True, exist_ok=True)
blend_output.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_pack_images=True)

glass_materials = []
solar_materials = []

for image in list(bpy.data.images):
    width, height = image.size
    longest = max(width, height)
    if longest > max_texture:
        ratio = max_texture / longest
        image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
        image.pack()

for index, material in enumerate(list(bpy.data.materials)):
    rgba = tuple(material.diffuse_color)
    r, g, b, a = rgba
    luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    original_name = material.name

    material.use_nodes = True
    nodes = material.node_tree.nodes
    shader = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    if shader is None:
        output_node = next((node for node in nodes if node.type == "OUTPUT_MATERIAL"), None) or nodes.new("ShaderNodeOutputMaterial")
        shader = nodes.new("ShaderNodeBsdfPrincipled")
        material.node_tree.links.new(shader.outputs["BSDF"], output_node.inputs["Surface"])

    if original_name in {"Material_15", "Material_16"}:
        material.name = f"ASTRA_Enclosure_Black_{index:02d}"
        for input_name in ("Base Color", "Metallic", "Roughness"):
            for link in list(shader.inputs[input_name].links):
                material.node_tree.links.remove(link)
        material.diffuse_color = (0.0, 0.0, 0.0, 1.0)
        shader.inputs["Base Color"].default_value = (0.0, 0.0, 0.0, 1.0)
        shader.inputs["Metallic"].default_value = 0.22
        shader.inputs["Roughness"].default_value = 0.28
        shader.inputs["Coat Weight"].default_value = 0.32
        shader.inputs["Coat Roughness"].default_value = 0.12
    elif a < 0.95:
        material.name = f"ASTRA_Glass_{index:02d}"
        for input_name in ("Base Color", "Alpha"):
            for link in list(shader.inputs[input_name].links):
                material.node_tree.links.remove(link)
        shader.inputs["Base Color"].default_value = (0.72, 0.86, 0.95, 1.0)
        shader.inputs["Alpha"].default_value = 1.0
        shader.inputs["Metallic"].default_value = 0.0
        shader.inputs["Roughness"].default_value = 0.06
        shader.inputs["IOR"].default_value = 1.5
        shader.inputs["Transmission Weight"].default_value = 1.0
        shader.inputs["Coat Weight"].default_value = 0.35
        shader.inputs["Coat Roughness"].default_value = 0.04
        glass_materials.append(material.name)
    elif original_name in {"Material_17", "Material_18"}:
        material.name = f"ASTRA_Textured_Surface_{index:02d}"
        shader.inputs["Metallic"].default_value = 0.12
        shader.inputs["Roughness"].default_value = 0.3
    elif abs(r - g) < 0.035 and abs(g - b) < 0.035:
        material.name = f"ASTRA_Frame_{index:02d}"
        shader.inputs["Metallic"].default_value = 0.72
        shader.inputs["Roughness"].default_value = 0.26 if luminance > 0.35 else 0.34
        shader.inputs["Coat Weight"].default_value = 0.16
        shader.inputs["Coat Roughness"].default_value = 0.12
    else:
        material.name = f"ASTRA_Detail_{index:02d}"
        shader.inputs["Metallic"].default_value = 0.16
        shader.inputs["Roughness"].default_value = 0.32

    material["astra_original_name"] = original_name

for obj in bpy.context.scene.objects:
    obj.select_set(False)
    if obj.type == "MESH":
        obj.data.validate(clean_customdata=False)
        obj.data.update()

bpy.ops.wm.save_as_mainfile(filepath=str(blend_output), compress=True)
bpy.ops.export_scene.gltf(
    filepath=str(output),
    export_format="GLB",
    export_materials="EXPORT",
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_apply=True,
)

report = {
    "source": str(source),
    "source_bytes": source.stat().st_size,
    "output": str(output),
    "output_bytes": output.stat().st_size,
    "blend_output": str(blend_output),
    "blend_bytes": blend_output.stat().st_size,
    "mesh_objects": len([obj for obj in bpy.context.scene.objects if obj.type == "MESH"]),
    "materials": len(bpy.data.materials),
    "glass_materials": glass_materials,
    "solar_materials": solar_materials,
    "max_texture": max_texture,
    "images": [{"name": image.name, "size": list(image.size)} for image in bpy.data.images],
}
print("ASTRA_OPTIMIZE_REPORT=" + json.dumps(report, ensure_ascii=False))

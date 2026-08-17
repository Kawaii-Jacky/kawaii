import bpy
import json
import sys
from pathlib import Path
from mathutils import Vector


def argv_value(flag: str) -> str:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if flag not in args:
        raise SystemExit(f"Missing required argument: {flag}")
    return args[args.index(flag) + 1]


source = Path(argv_value("--input")).resolve()
if not source.exists():
    raise SystemExit(f"Input does not exist: {source}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_pack_images=True)

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
object_rows = []
all_points = []
triangle_count = 0
vertex_count = 0

for obj in mesh_objects:
    mesh = obj.data
    mesh.calc_loop_triangles()
    triangles = len(mesh.loop_triangles)
    vertices = len(mesh.vertices)
    triangle_count += triangles
    vertex_count += vertices
    all_points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    object_rows.append(
        {
            "name": obj.name,
            "triangles": triangles,
            "vertices": vertices,
            "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
            "dimensions": [round(value, 6) for value in obj.dimensions],
        }
    )

if all_points:
    mins = [min(point[index] for point in all_points) for index in range(3)]
    maxs = [max(point[index] for point in all_points) for index in range(3)]
    bounds = {
        "min": [round(value, 6) for value in mins],
        "max": [round(value, 6) for value in maxs],
        "size": [round(maxs[index] - mins[index], 6) for index in range(3)],
    }
else:
    bounds = None

materials = []
for material in bpy.data.materials:
    materials.append(
        {
            "name": material.name,
            "base_color": [round(value, 5) for value in material.diffuse_color],
            "metallic": round(material.metallic, 5),
            "roughness": round(material.roughness, 5),
            "blend_method": getattr(material, "surface_render_method", "DITHERED"),
        }
    )

report = {
    "source": str(source),
    "source_bytes": source.stat().st_size,
    "blender": bpy.app.version_string,
    "objects": len(bpy.context.scene.objects),
    "mesh_objects": len(mesh_objects),
    "vertices": vertex_count,
    "triangles": triangle_count,
    "materials": materials,
    "images": [
        {
            "name": image.name,
            "size": list(image.size),
            "packed_bytes": image.packed_file.size if image.packed_file else 0,
            "filepath": image.filepath,
        }
        for image in bpy.data.images
    ],
    "animations": [action.name for action in bpy.data.actions],
    "bounds": bounds,
    "largest_meshes": sorted(object_rows, key=lambda row: row["triangles"], reverse=True)[:30],
}

print("ASTRA_MODEL_REPORT=" + json.dumps(report, ensure_ascii=False))

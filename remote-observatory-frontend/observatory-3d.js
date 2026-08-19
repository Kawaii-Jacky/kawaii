import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const stage = document.querySelector("#observatory-stage");
const canvas = document.querySelector("#observatory-canvas");
const interactionSurface = document.querySelector("#observatory-interaction-layer") || canvas;
const loadingLabel = document.querySelector("#observatory-loading span");
const effectButtons = [...document.querySelectorAll("[data-model-effect]")];
const NATIVE_RUNTIME = Boolean(window.__TAURI__?.core?.invoke);
// The compact web model relies exclusively on EXT_texture_webp. Some native
// WebView builds load its geometry but silently omit extension-only textures,
// so Tauri uses the equivalent core glTF model with embedded PNG textures.
const MODEL_SOURCE = NATIVE_RUNTIME ? "external-png" : "webp-extension";
const MODEL_URL = NATIVE_RUNTIME
  ? "./assets/models/observatory-native.glb?v=20260819-1"
  : "./assets/models/observatory-web-v3.glb?v=20260817-1";

const statusSources = [...document.querySelectorAll(".orbiting-statuses-front [id]")];
const statusClones = new Map([...document.querySelectorAll("[data-status-clone]")].map((clone) => [clone.dataset.statusClone, clone]));
function syncStatusClone(source) {
  const clone = statusClones.get(source.id);
  if (!clone) return;
  clone.className = source.className;
  clone.setAttribute("aria-label", source.getAttribute("aria-label") || "");
  clone.setAttribute("title", source.getAttribute("title") || "");
}
statusSources.forEach(syncStatusClone);
if (statusSources.length && statusClones.size) {
  const statusObserver = new MutationObserver((records) => records.forEach((record) => {
    if (record.type === "attributes") syncStatusClone(record.target);
  }));
  statusSources.forEach((source) => statusObserver.observe(source, { attributes:true, attributeFilter:["class", "aria-label", "title"] }));
}

if (stage && canvas) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  camera.position.set(3.35, 2.05, 3.7);

  const statusSpriteGroup = new THREE.Group();
  statusSpriteGroup.name = "ASTRA_Status_Orbit";
  statusSpriteGroup.visible = false;
  scene.add(statusSpriteGroup);
  const statusSprites = new Map();
  const statusClock = new THREE.Clock();

  function drawStatusIcon(context, kind) {
    context.strokeStyle = "#111111";
    context.fillStyle = "#111111";
    context.lineWidth = 5;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (kind === "solar") {
      context.strokeRect(35, 39, 58, 39);
      context.beginPath();
      context.moveTo(54, 39); context.lineTo(50, 78);
      context.moveTo(74, 39); context.lineTo(78, 78);
      context.moveTo(35, 58); context.lineTo(93, 58);
      context.moveTo(64, 78); context.lineTo(64, 91);
      context.moveTo(52, 91); context.lineTo(76, 91);
      context.stroke();
    } else if (kind === "temperature") {
      context.beginPath();
      context.arc(64, 82, 13, 0, Math.PI * 2);
      context.moveTo(55, 73); context.lineTo(55, 39);
      context.arc(64, 39, 9, Math.PI, 0);
      context.lineTo(73, 73);
      context.stroke();
      context.beginPath();
      context.arc(64, 82, 6, 0, Math.PI * 2);
      context.moveTo(64, 76); context.lineTo(64, 50);
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(37, 71);
      context.bezierCurveTo(25, 67, 28, 51, 41, 50);
      context.bezierCurveTo(45, 32, 72, 30, 80, 49);
      context.bezierCurveTo(99, 50, 101, 72, 84, 73);
      context.lineTo(37, 73);
      context.stroke();
      [[47,82,42,94],[65,82,60,94],[83,82,78,94]].forEach(([x1,y1,x2,y2]) => {
        context.beginPath(); context.moveTo(x1,y1); context.lineTo(x2,y2); context.stroke();
      });
    }
  }

  function paintStatusTexture(source, kind, canvasTexture) {
    const textureCanvas = canvasTexture.image;
    const context = textureCanvas.getContext("2d");
    const active = source.classList.contains("generating") || source.classList.contains("active") || source.classList.contains("raining");
    context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
    context.save();
    context.shadowColor = active ? "rgba(255,255,255,.48)" : "rgba(0,0,0,.18)";
    context.shadowBlur = active ? 15 : 7;
    context.fillStyle = active ? "#f5f5f2" : "#777777";
    context.beginPath(); context.arc(64, 64, 48, 0, Math.PI * 2); context.fill();
    context.shadowBlur = 0;
    drawStatusIcon(context, kind);
    context.restore();
    canvasTexture.needsUpdate = true;
  }

  const statusKinds = { "hero-solar":"solar", "hero-temperature-icon":"temperature", "hero-rain-icon":"rain" };
  statusSources.forEach((source, index) => {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 128; textureCanvas.height = 128;
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map:texture, transparent:true, alphaTest:.04, depthTest:true, depthWrite:false });
    const sprite = new THREE.Sprite(material);
    sprite.name = `ASTRA_Status_${statusKinds[source.id]}`;
    sprite.scale.set(.44, .44, 1);
    sprite.userData.baseScale = .44;
    sprite.userData.phase = index * Math.PI * 2 / statusSources.length;
    sprite.userData.sourceId = source.id;
    statusSpriteGroup.add(sprite);
    statusSprites.set(source.id, { sprite, texture, kind:statusKinds[source.id] });
    paintStatusTexture(source, statusKinds[source.id], texture);
  });

  const statusSpriteObserver = new MutationObserver((records) => records.forEach((record) => {
    const status = statusSprites.get(record.target.id);
    if (status) paintStatusTexture(record.target, status.kind, status.texture);
  }));
  statusSources.forEach((source) => statusSpriteObserver.observe(source, { attributes:true, attributeFilter:["class"] }));

  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.035).texture;
  pmrem.dispose();

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(4, 6, 5);
  const rimLight = new THREE.DirectionalLight(0xffffff, 1.9);
  rimLight.position.set(-4, 2.5, -3);
  const fillLight = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 1.45);
  scene.add(keyLight, rimLight, fillLight);

  const controls = new OrbitControls(camera, interactionSurface);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = 0.62;
  controls.maxPolarAngle = 1.72;
  // Keep the initial fallback image still while the GLB transfers. Motion is
  // enabled only after the real model has been attached to the scene.
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.34;
  // Fit the enclosure pivot at the stage center.  The card layout owns the
  // requested 20px downward offset; the camera should not add a second
  // vertical bias that pushes the observatory toward the lower edge.
  controls.target.set(0, 0, 0);

  let model = null;
  let modelPivot = null;
  let modelMeshes = [];
  let visible = true;
  let currentEffect = readEffect();

  function readEffect() {
    return "realistic";
  }

  function themeColor() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#469665";
    return new THREE.Color(value);
  }

  function wireColor() {
    return themeColor().lerp(new THREE.Color(0xffffff), 0.78);
  }

  function asArray(material) {
    return Array.isArray(material) ? material : [material];
  }

  function realisticMaterial(source) {
    const name = source.name || "";
    if (name.includes("ASTRA_Enclosure_Black")) {
      return new THREE.MeshPhysicalMaterial({
        name,
        color: 0x000000,
        metalness: 0.22,
        roughness: 0.28,
        clearcoat: 0.32,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.15,
        side: THREE.DoubleSide,
      });
    }
    if (name.includes("ASTRA_Glass")) {
      const glass = new THREE.MeshPhysicalMaterial({
        name,
        color: 0xd5ecff,
        metalness: 0,
        roughness: 0.045,
        transmission: 1,
        thickness: 0.055,
        ior: 1.52,
        clearcoat: 0.45,
        clearcoatRoughness: 0.025,
        envMapIntensity: 2.2,
        side: THREE.DoubleSide,
      });
      glass.depthWrite = false;
      return glass;
    }

    if (name.includes("ASTRA_Solar")) {
      return new THREE.MeshPhysicalMaterial({
        name,
        color: 0x061630,
        metalness: 0.32,
        roughness: 0.12,
        ior: 1.47,
        clearcoat: 1,
        clearcoatRoughness: 0.035,
        iridescence: 0.12,
        iridescenceIOR: 1.3,
        envMapIntensity: 2.35,
        side: THREE.DoubleSide,
      });
    }

    const material = source.clone();
    if (material.isMeshStandardMaterial) {
      material.envMapIntensity = name.includes("ASTRA_Frame") ? 1.65 : 1.15;
      material.metalness = name.includes("ASTRA_Frame") ? Math.max(material.metalness, 0.68) : material.metalness;
      material.roughness = name.includes("ASTRA_Frame") ? Math.min(material.roughness, 0.3) : material.roughness;
    }
    material.side = THREE.DoubleSide;
    return material;
  }

  function studioMaterial(source) {
    const color = source.color ? source.color.clone() : new THREE.Color(0.55, 0.55, 0.55);
    const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
    const neutral = source.name?.includes("ASTRA_Enclosure_Black")
      ? new THREE.Color(0x000000)
      : new THREE.Color().setHSL(0, 0, THREE.MathUtils.clamp(luminance * 0.82 + 0.12, 0.11, 0.82));
    return new THREE.MeshStandardMaterial({
      name: `${source.name || "material"}_studio`,
      color: neutral,
      metalness: source.name?.includes("ASTRA_Enclosure_Black") ? 0.22 : source.name?.includes("Frame") ? 0.72 : 0.18,
      roughness: source.name?.includes("ASTRA_Enclosure_Black") ? 0.28 : source.name?.includes("Frame") ? 0.24 : 0.38,
      envMapIntensity: 1.45,
      side: THREE.DoubleSide,
      transparent: source.name?.includes("Glass") || false,
      opacity: source.name?.includes("Glass") ? 0.26 : 1,
      depthWrite: !source.name?.includes("Glass"),
    });
  }

  function wireframeMaterial(source) {
    return new THREE.MeshBasicMaterial({
      name: `${source.name || "material"}_wireframe`,
      color: wireColor(),
      wireframe: true,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
  }

  function prepareMaterials(mesh) {
    const sources = asArray(mesh.material);
    mesh.userData.astraMaterials = {
      realistic: sources.map(realisticMaterial),
      studio: sources.map(studioMaterial),
      wireframe: sources.map(wireframeMaterial),
      multiple: Array.isArray(mesh.material),
    };
  }

  function applyEffect(effect, persist = true) {
    effect = "realistic";
    currentEffect = effect;
    stage.dataset.modelEffect = effect;
    modelMeshes.forEach((mesh) => {
      const set = mesh.userData.astraMaterials;
      if (!set) return;
      if (effect === "wireframe") set.wireframe.forEach((material) => material.color.copy(wireColor()));
      mesh.material = set.multiple ? set[effect] : set[effect][0];
    });
    renderer.toneMappingExposure = effect === "realistic" ? 1.12 : effect === "studio" ? 1.28 : 0.92;
    effectButtons.forEach((button) => button.classList.toggle("active", button.dataset.modelEffect === effect));
  }

  function fitModel(root) {
    root.updateMatrixWorld(true);
    const fullBox = new THREE.Box3().setFromObject(root);
    const size = fullBox.getSize(new THREE.Vector3());
    const enclosures = [];
    root.traverse((node) => {
      if (!node.isMesh) return;
      if (asArray(node.material).some((material) => material?.name?.includes("ASTRA_Enclosure_Black"))) enclosures.push(node);
    });
    const enclosureBox = enclosures.length
      ? enclosures.reduce((box, enclosure) => box.union(new THREE.Box3().setFromObject(enclosure)), new THREE.Box3())
      : null;
    const pivotCenter = enclosureBox ? enclosureBox.getCenter(new THREE.Vector3()) : fullBox.getCenter(new THREE.Vector3());
    root.position.sub(pivotCenter);
    const pivot = new THREE.Group();
    pivot.name = "ASTRA_Enclosure_Pivot";
    pivot.add(root);
    const scale = 2.28 / Math.max(size.x, size.y, size.z);
    pivot.scale.setScalar(scale);
    pivot.rotation.y = -0.52;
    pivot.rotation.x = -0.035;
    pivot.updateMatrixWorld(true);
    return pivot;
  }

  function resize() {
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const mobile = window.matchMedia("(max-width: 620px)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.3));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = mobile ? 34 : 30;
    camera.updateProjectionMatrix();
  }

  effectButtons.forEach((button) => {
    button.dataset.effectControl = "bound";
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stage.dataset.lastEffectClick = button.dataset.modelEffect;
      applyEffect(button.dataset.modelEffect);
    });
  });

  reducedMotion.addEventListener("change", () => {
    controls.autoRotate = Boolean(model) && !reducedMotion.matches;
  });

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  }, { threshold: 0.01 }).observe(stage);

  new MutationObserver(() => {
    if (currentEffect === "wireframe") applyEffect("wireframe", false);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-color", "data-color-mode"] });

  resize();
  applyEffect(currentEffect, false);

  const loader = new GLTFLoader();
  loader.load(
    MODEL_URL,
    (gltf) => {
      model = gltf.scene;
      modelPivot = fitModel(model);
      model.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = false;
        prepareMaterials(node);
        modelMeshes.push(node);
      });
      scene.add(modelPivot);
      applyEffect(currentEffect, false);
      stage.dataset.modelMeshes = String(modelMeshes.length);
      const enclosureMesh = modelMeshes.find((mesh) => asArray(mesh.material).some((material) => material?.name?.includes("ASTRA_Enclosure_Black")));
      const enclosureMaterial = enclosureMesh ? asArray(enclosureMesh.material).find((material) => material?.name?.includes("ASTRA_Enclosure_Black")) : null;
      stage.dataset.enclosureMaterial = enclosureMaterial?.name || "missing";
      stage.dataset.enclosureColor = enclosureMaterial?.color ? `#${enclosureMaterial.color.getHexString()}` : "missing";
      stage.dataset.enclosureMeshes = String(modelMeshes.filter((mesh) => asArray(mesh.material).some((material) => material?.name?.includes("ASTRA_Enclosure_Black"))).length);
      stage.dataset.rotationPivot = modelPivot?.name || "missing";
      stage.dataset.modelOffset = model ? [model.position.x, model.position.y, model.position.z].map((value) => value.toFixed(4)).join(",") : "missing";
      stage.dataset.glassMaterials = String(modelMeshes.reduce((count, mesh) => {
        const materials = mesh.userData.astraMaterials?.realistic || [];
        return count + materials.filter((material) => material.isMeshPhysicalMaterial && material.transmission > 0).length;
      }, 0));
      const texturedMaterials = modelMeshes.reduce((count, mesh) => {
        const materials = mesh.userData.astraMaterials?.realistic || [];
        return count + materials.filter((material) => Boolean(material.map)).length;
      }, 0);
      stage.dataset.modelSource = MODEL_SOURCE;
      stage.dataset.texturedMaterials = String(texturedMaterials);
      stage.classList.add("model-ready");
      statusSpriteGroup.visible = false;
      stage.dataset.statusSprites = "0";
      stage.dataset.statusIndicatorMode = "html-orbit";
      loadingLabel.textContent = "三维模型就绪";
      controls.autoRotate = !reducedMotion.matches;
      if (NATIVE_RUNTIME) {
        window.__TAURI__.core.invoke("report_model_health", {
          report: {
            model_source: MODEL_SOURCE,
            mesh_count: modelMeshes.length,
            textured_materials: texturedMaterials,
          },
        }).catch((error) => console.error("Native model health check failed", error));
      }
      window.dispatchEvent(new CustomEvent("observatory:model-ready"));
      window.__ASTRA_3D__ = { renderer, scene, camera, controls, model, modelPivot, statusSpriteGroup, statusSprites, applyEffect };
    },
    (event) => {
      const total = Number(event.total) || 0;
      const loaded = Number(event.loaded) || 0;
      const progress = total > 0 ? Math.round(loaded / total * 100) : null;
      loadingLabel.textContent = Number.isFinite(progress) ? `加载模型 ${progress}%` : "接收模型数据…";
      window.dispatchEvent(new CustomEvent("observatory:model-progress", { detail: { progress, loaded, total } }));
    },
    (error) => {
      console.error("Observatory GLB failed to load", error);
      stage.classList.add("model-error");
      loadingLabel.textContent = "三维模型不可用";
      window.dispatchEvent(new CustomEvent("observatory:model-error"));
    },
  );

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    controls.update();
    if (statusSpriteGroup.visible) {
      const time = reducedMotion.matches ? 0 : statusClock.getElapsedTime();
      statusSprites.forEach(({ sprite }) => {
        const angle = sprite.userData.phase + time * Math.PI * 2 / 18;
        const x = Math.cos(angle) * 1.34;
        const depth = Math.sin(angle) * 1.12;
        const planeTilt = THREE.MathUtils.degToRad(23);
        const y = .1 + depth * Math.sin(planeTilt) + x * .16;
        const z = depth * Math.cos(planeTilt);
        sprite.position.set(x, y, z);
        const cameraDistance = sprite.position.distanceTo(camera.position);
        const distanceScale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(cameraDistance, 3.7, 6.5, 1.38, .72), .72, 1.38);
        const scale = sprite.userData.baseScale * distanceScale;
        sprite.scale.set(scale, scale, 1);
      });
    }
    renderer.render(scene, camera);
  });
}

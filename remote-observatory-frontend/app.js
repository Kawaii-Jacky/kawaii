(() => {
  "use strict";

  function initModelGate() {
    const gate = document.querySelector("#app-preloader");
    const shell = document.querySelector(".app-shell");
    if (!gate || !shell) return;
    if (window.__TAURI__?.core?.invoke) {
      document.documentElement.classList.add("model-gate-ready");
      document.documentElement.dataset.nativeModelPreload = "background";
      gate.remove();
      return;
    }
    let revealed = false;
    const title = document.querySelector("#app-preloader-title");
    const status = document.querySelector("#app-preloader-status");
    const reveal = (message) => {
      if (revealed) return;
      revealed = true;
      if (message && status) status.textContent = message;
      document.documentElement.classList.add("model-gate-ready");
      gate.classList.add("is-complete");
      gate.setAttribute("aria-busy", "false");
      window.setTimeout(() => gate.remove(), 420);
    };
    window.addEventListener("observatory:model-progress", (event) => {
      const progress = Number(event.detail?.progress);
      const bar = document.querySelector("#app-preloader-progress");
      const track = document.querySelector(".app-preloader-bar");
      if (track && Number.isFinite(progress)) track.classList.remove("indeterminate");
      if (track && !Number.isFinite(progress)) track.classList.add("indeterminate");
      if (bar && Number.isFinite(progress)) bar.style.width = `${Math.max(4, Math.min(100, progress))}%`;
      if (status) status.textContent = Number.isFinite(progress) ? `正在加载三维场景 ${Math.round(progress)}%` : "正在接收模型数据…";
    });
    window.addEventListener("observatory:model-ready", () => {
      const bar = document.querySelector("#app-preloader-progress");
      const track = document.querySelector(".app-preloader-bar");
      if (bar) bar.style.width = "100%";
      if (track) track.classList.remove("indeterminate");
      if (title) title.textContent = "天文台模型就绪";
      reveal("正在进入控制台…");
    }, { once: true });
    window.addEventListener("observatory:model-error", () => {
      if (title) title.textContent = "使用备用天文台图像";
      reveal("三维模型暂不可用，已切换备用图");
    }, { once: true });
    window.setTimeout(() => {
      if (!revealed) {
        if (title) title.textContent = "模型加载超时";
        reveal("网络响应较慢，已切换备用图");
      }
    }, 9000);
  }

  initModelGate();

  function initPwa() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js?v=20260820-04", { scope: "./" }).then(registration => {
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            const guide = document.querySelector("#pwa-install-guide");
            const copy = document.querySelector("#pwa-install-copy");
            waitingWorker = worker;
            if (action) { action.hidden = false; action.textContent = "更新"; }
            if (copy) copy.textContent = "新版本已准备就绪，确认后立即更新。";
            if (guide && copy) { copy.textContent = "新版本已准备就绪，刷新页面即可更新。"; guide.hidden = false; }
          }
        });
      });
    }).catch(() => {});
    const guide = document.querySelector("#pwa-install-guide");
    const dismiss = document.querySelector("#pwa-install-dismiss");
    const action = document.querySelector("#pwa-install-action");
    let waitingWorker = null;
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (guide && ios && !standalone && !sessionStorage.getItem("astra.pwaInstallDismissed")) guide.hidden = false;
    dismiss?.addEventListener("click", () => { guide.hidden = true; sessionStorage.setItem("astra.pwaInstallDismissed", "1"); });
    action?.addEventListener("click", () => {
      if (!waitingWorker) return;
      action.disabled = true;
      navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !state.auth.user || state.simulationEnabled || !state.controller.configured) return;
      if (!state.eventSource || state.eventSource.readyState === EventSource.CLOSED) connectEventStream();
      else syncRealtimeSnapshot();
    });
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const isNativeRuntime = () => Boolean(window.__TAURI__?.core?.invoke);
  const nativeInvoke = (command, args = {}) => window.__TAURI__.core.invoke(command, args);
  let nativeEventUnlisten = null;
  let nativeEventBuffer = "";
  async function nativeRequest(path, options = {}) {
    const result = await nativeInvoke("native_fetch", {
      path,
      method: options.method || "GET",
      body: options.body || null
    });
    const data = result?.body ? JSON.parse(result.body) : null;
    if (Number(result?.status) < 200 || Number(result?.status) >= 300) {
      const error = new Error(typeof data?.detail === "string" ? data.detail : `请求失败 (${result?.status || 0})`);
      error.status = Number(result?.status || 0);
      throw error;
    }
    return data;
  }
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const hasNumber = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  const number = (value, fallback = 0) => hasNumber(value) ? Number(value) : fallback;
  const bool = value => value === true || value === 1 || value === "1" || value === "true";
  const fmt = (value, digits = 1) => hasNumber(value) ? Number(value).toFixed(digits) : "--";
  const rounded = value => hasNumber(value) ? String(Math.round(Number(value))) : "--";
  const timestamp = (value = Date.now()) => new Date(value).toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };
  const setHtml = (selector, value) => { const node = $(selector); if (node) node.innerHTML = value; };
  let weatherSearchSequence = 0;
  let weatherSearchTimer = 0;
  let authCooldownTimer = 0;
  const seeingSourceMeta = {
    openmeteo: { label:"Open-Meteo 推算", legend:"视宁度参考评分", title:"视宁度参考", unit:"/ 100", color:"#b58cff" },
    seventimer: { label:"7Timer 天文预报", legend:"视宁度", title:"视宁度", unit:"arcsec", color:"#7fc8ff" }
  };
  const savedSeeingSource = localStorage.getItem("astra.seeingSource");
  const initialSeeingSource = savedSeeingSource === "weather" ? "openmeteo" : (seeingSourceMeta[savedSeeingSource] ? savedSeeingSource : "openmeteo");

  const routeMeta = {
    login: ["00", "账户登录"],
    overview: ["01", "观测总览"], power: ["02", "能源系统"], environment: ["03", "环境与屋顶"],
    flat: ["04", "电动平场板"], profile: ["05", "个人中心"]
  };
  const requestedInitialRoute = routeMeta[location.hash.replace("#", "")]
    ? location.hash.replace("#", "")
    : "overview";

  const state = {
    mode: "live",
    route: "login",
    connected: false,
    simulationEnabled:false,
    simulationTimer:0,
    eventSource: null,
    themeColor: ["black","ink-green","deep-blue","amber","star-pink"].includes(localStorage.getItem("astra.themeColor")) ? localStorage.getItem("astra.themeColor") : "black",
    colorMode: localStorage.getItem("astra.colorMode") || "light",
    fontSize: localStorage.getItem("astra.fontScaleVersion") === "2" ? (localStorage.getItem("astra.fontSize") || "small") : "small",
    online: { "esp32-001": false, "mppt-001": false, "ef-001": false },
    lastSeen: {},
    main: {
      dht_temperature:null, dht_humidity:null, utc_temperature:null, output_voltage:null,
      output_current:null, power_output:null, rain_analog:null, rain_detected:null,
      heater:null, fan:null, mosfet:null, camera:null, bluetooth:null,
      heater_mode:null, fan_mode:null, fan_threshold:null, cameraDurationMinutes:null, cameraOffAt:0,
      roof:null, roofPosition:null
    },
    power: {
      power_input:null, battery_percent:null, current_input:null, buck_current:null, buck_power:null,
      voltage_input:null, buck_voltage:null, temperature:null, pwm:null, fan:null,
      enable_fan:null, mode:null, daily_energy:null, total_energy:null, buck_efficiency:null,
      days_running:null, voltage_battery_min:null, voltage_battery_max:null, current_charging:null,
      temperature_fan:null
    },
    flat: { humidity:null, servo:null, servoMoving:null, led:null, heater:null, heater_mode:null, angle:null, maxAngle:null, brightness:null, humi_threshold:null, heater_power:null },
    historyRange: 360,
    powerYRange: "auto",
    environmentLiveRange: 360,
    environmentYRange: "auto",
    environmentForecastRange: 24 * 60,
    environmentForecastYRange: "auto",
    forecastRange: 24,
    forecastYRange: "auto",
    sevenTimerRange: 24,
    seeingSource: initialSeeingSource,
    forecast: {
      location:null,
      timezone: "Asia/Shanghai", loading: false,
      hourly: { time: [], temperature: [], humidity: [], cloud: [], precipitation: [], visibility: [], wind: [], seeing: [], clear: [] }
    },
    sevenTimer: { labels: [], seeing: [], clear: [], transparency: [], cloud: [], loading:false, error:"", init:"", updatedAt:0 },
    visibleSeries: { solar: true, charge: true, battery: true, temperature: true, humidity: true },
    history: { solar: [], charge: [], battery: [], temperature: [], humidity: [], labels: [], sources: [] },
    deviceHistory: { range:360, loading:false, error:"", connectUnknown:false, devices:[], alerts:[], labels:[], series:{} },
    auth: { user:null, loading:true, mode:"login", channel:"phone", cooldown:0, returnRoute:requestedInitialRoute === "login" ? "overview" : requestedInitialRoute },
    controller: { configured:false, loading:false, data:null, requests:[], error:"" },
    pendingConfirm: null,
    terminal: []
  };
  const simulationAnimationTimers = new Set();

  function buildHistory() {
    Object.values(state.history).forEach(values => { values.length = 0; });
  }

  function renderHumiditySparkline() {
    const values = state.history.humidity.map((value,index)=>({value,index})).filter(item=>(state.simulationEnabled||state.history.sources[item.index]!==true)&&hasNumber(item.value)).slice(-25).map(item=>Number(item.value));
    const currentHumidity = Number(state.main.dht_humidity);
    if (values.length && Number.isFinite(currentHumidity)) values[values.length - 1] = currentHumidity;
    const line = $("#humidity-spark-line"), area = $("#humidity-spark-area"), point = $("#humidity-spark-point"), wrap = $(".humidity-sparkline"), svg = wrap?.querySelector("svg");
    if (!line || !area || !point || !wrap || !svg) return;
    if (!isDeviceOnline("esp32-001") || !Number.isFinite(currentHumidity) || values.length < 2) {
      line.removeAttribute("points"); area.removeAttribute("d"); point.removeAttribute("cx"); point.removeAttribute("cy");
      wrap.setAttribute("aria-label", "暂无真实湿度历史");
      return;
    }
    const bounds = wrap.getBoundingClientRect();
    const width = Math.max(bounds.width, 100), height = Math.max(bounds.height, 34);
    const top = 3, bottom = height - 4;
    svg.setAttribute("viewBox", `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`);
    const min = Math.min(...values), max = Math.max(...values), padding = Math.max((max - min) * .18, .45);
    const low = min - padding, high = max + padding, range = Math.max(high - low, 1);
    const points = values.map((value, index) => {
      const x = index / (values.length - 1) * width;
      const y = top + (1 - (value - low) / range) * (bottom - top);
      return [x, y];
    });
    const pointsText = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    line.setAttribute("points", pointsText);
    area.setAttribute("d", `M 0 ${height.toFixed(2)} L ${pointsText.replaceAll(" ", " L ")} L ${width.toFixed(2)} ${height.toFixed(2)} Z`);
    point.setAttribute("cx", points.at(-1)[0].toFixed(2));
    point.setAttribute("cy", points.at(-1)[1].toFixed(2));
    wrap?.setAttribute("aria-label", `最近两小时相对湿度趋势，${fmt(values[0])}% 至 ${fmt(values.at(-1))}%`);
  }

  function routeTo(route) {
    if (!routeMeta[route]) route = "overview";
    if (route === "login" && state.auth.user) route = state.auth.returnRoute || "profile";
    if (route !== "login" && !state.auth.user) {
      state.auth.returnRoute = route;
      route = "login";
    }
    state.route = route;
    location.hash = route;
    document.body.classList.toggle("auth-route", route === "login");
    $$(".page").forEach(page => page.classList.toggle("active", page.dataset.page === route));
    $$('[data-route]').forEach(button => button.classList.toggle("active", button.dataset.route === route));
    setText("#page-index", routeMeta[route][0]);
    setText("#page-title", routeMeta[route][1]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(drawCharts);
  }

  let settingsHistoryActive = false;

  function openSettings() {
    const drawer = $("#settings-drawer");
    if (!drawer.classList.contains("open")) {
      history.pushState({ ...(history.state || {}), astraOverlay:"settings" }, "", location.href);
      settingsHistoryActive = true;
    }
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    $("#drawer-backdrop").classList.add("open");
    if (state.auth.user) loadControllerConnection();
  }
  function closeSettings(options) {
    const drawer = $("#settings-drawer");
    const wasOpen = drawer.classList.contains("open");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    $("#drawer-backdrop").classList.remove("open");
    if (wasOpen && settingsHistoryActive && options?.fromHistory !== true) {
      settingsHistoryActive = false;
      history.back();
    }
  }

  function selectConnectionMode() {
    state.mode = "live";
    $$('[data-connection-mode]').forEach(button => button.classList.toggle("active", button.dataset.connectionMode === "live"));
    $("#connection-form").classList.remove("disabled");
    setHtml("#connection-hint", '<span class="status-dot"></span>登录后自动连接后端实时通道。');
    renderSeeingSource();
  }

  function downloadControllerHeader(device) {
    if (!device?.header_content) return;
    const blob = new Blob([device.header_content], { type:"text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = device.header_file || `${device.device_id}.h`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  function renderControllerConnection() {
    const status = $("#controller-connection-status"), form = $("#controller-request-form"), list = $("#controller-header-configs");
    if (!status || !list) return;
    list.hidden = true; list.innerHTML = "";
    if (!form) {
      if (!state.auth.user) { status.textContent = "登录后会自动分配可用的硬件套组。"; return; }
      if (state.controller.loading) { status.textContent = "正在读取硬件套组…"; return; }
      if (state.controller.error) { status.textContent = state.controller.error; return; }
      if (state.controller.configured && state.controller.data) {
        const data = state.controller.data;
        status.textContent = `当前套组：${data.name} · ${data.controller_id} · 已授权三台设备`;
        list.hidden = false;
        list.innerHTML = `<h3>设备头文件配置</h3><p>配置包含 MQTT 账号密码，可下载后写入对应硬件。</p>${(data.devices||[]).map(device=>`<article class="controller-header-card"><header><b>${escapeHtml(device.device_id)}</b><small>${escapeHtml(device.header_file||device.filename||"")} · ${escapeHtml(device.client_id||device.username||"")}</small></header><pre>${escapeHtml(device.content||device.header_content||"")}</pre><button type="button" class="outline-button" data-download-controller-header="${escapeHtml(device.device_id)}">下载头文件</button></article>`).join("")}`;
        return;
      }
      status.innerHTML = `当前账户尚未分配硬件套组。<button type="button" class="primary-button" id="auto-assign-controller">自动分配并连接</button>`;
      $("#auto-assign-controller")?.addEventListener("click", autoAssignController);
      return;
    }
    if (!state.auth.user) { status.textContent = "登录后会显示当前授权的硬件套组。"; form.hidden = true; return; }
    if (state.controller.loading) { status.textContent = "正在读取套组授权…"; form.hidden = true; return; }
    if (state.controller.error) { status.textContent = state.controller.error; form.hidden = true; return; }
    if (state.controller.configured && state.controller.data) {
      const data = state.controller.data;
      status.textContent = `当前套组：${data.name} · ${data.controller_id} · 已授权三台设备`;
      form.hidden = true; list.hidden = false;
      list.innerHTML = `<h3>设备头文件配置</h3><p>这些配置包含 MQTT 账号密码，仅用于写入对应硬件文件。</p>${(data.devices||[]).map(device=>`<article class="controller-header-card"><header><b>${escapeHtml(device.device_id)}</b><small>${escapeHtml(device.header_file||"")} · ${escapeHtml(device.client_id||device.username||"")}</small></header><pre>${escapeHtml(device.content||device.header_content||"")}</pre><button type="button" class="outline-button" data-download-controller-header="${escapeHtml(device.device_id)}">下载头文件</button></article>`).join("")}`;
      return;
    }
    const pending = state.controller.requests.find(item => item.status === "pending");
    if (pending) {
      status.textContent = `套组申请审核中：${pending.requested_name} · 提交于 ${timestamp(pending.created_at)}`;
      form.hidden = true;
      return;
    }
    status.textContent = "当前账户尚未分配硬件套组，可提交申请由管理员审核。";
    form.hidden = false;
  }

  async function loadControllerConnection() {
    if (!state.auth.user) return false;
    if (state.controller.loading) return null;
    state.controller.loading = true; renderControllerConnection();
    let loaded = false;
    try {
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const assignment = await apiRequest("/api/v1/controller/connection");
          state.controller.configured = Boolean(assignment.configured);
          state.controller.data = assignment.configured ? assignment : null;
          state.controller.error = "";
          loaded = true;
          break;
        } catch (error) {
          lastError = error;
          if (error.status === 401 || error.status === 403 || attempt === 2) break;
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
      if (!loaded) {
        console.warn("Unable to load controller authorization", lastError);
        state.controller.error = "授权信息暂时无法读取，请检查网络后点击重新连接。";
      }
    } finally { state.controller.loading = false; renderControllerConnection(); }
    return loaded;
  }

  async function submitControllerRequest(event) {
    event.preventDefault();
    const name = $("#controller-request-name")?.value.trim() || "", note = $("#controller-request-note")?.value.trim() || "", message = $("#controller-request-message"), button = event.submitter;
    if (!name) { if (message) message.textContent = "请输入申请套组名称。"; return; }
    if (button) button.disabled = true;
    try { await apiRequest("/api/v1/controller-requests", { method:"POST", body:JSON.stringify({ requested_name:name, note }) }); $("#controller-request-form")?.reset(); if (message) message.textContent = "申请已提交，等待管理员审核。"; await loadControllerConnection(); }
    catch (error) { if (message) message.textContent = error.message || "申请提交失败。"; }
    finally { if (button) button.disabled = false; }
  }

  async function autoAssignController(event) {
    const button = event?.currentTarget || $("#auto-assign-controller");
    if (button) button.disabled = true;
    try {
      try {
        await apiRequest("/api/v1/controller/connection/auto-assign", { method:"POST" });
      } catch (error) {
        if (error.status !== 409 || !/暂无可自动分配的空闲套组/.test(error.message || "")) throw error;
        toast("正在创建专属硬件套组", "后台正在生成设备、MQTT 凭据和访问权限。", "ok", "background");
        await apiRequest("/api/v1/controller/connection/auto-provision", { method:"POST" });
      }
      let assignment = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
          const candidate = await apiRequest("/api/v1/controller/connection");
          if (candidate?.configured) { assignment = candidate; break; }
        } catch (_) { /* API may be restarting after MQTT provisioning. */ }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (!assignment) throw new Error("套组已创建，但后台重载尚未完成，请稍后重试。");
      state.controller.configured = true;
      state.controller.data = assignment;
      renderControllerConnection();
      connectEventStream();
      toast("硬件套组已自动创建并分配", "三台设备与实时通道已经准备完成。", "ok", "background");
    } catch (error) {
      toast(error.message || "暂无可用硬件套组", "请稍后重试或联系管理员。", "error", "background");
    } finally { if (button) button.disabled = false; }
  }

  const deviceIds = ["esp32-001", "mppt-001", "ef-001"];
  const deviceMeta = {
    "esp32-001": { label:"主控", color:"#54d79a" },
    "mppt-001": { label:"能源", color:"#7fc8ff" },
    "ef-001": { label:"平场板", color:"#f2a14b" }
  };
  const deviceOnlineTimeout = 30000;

  function canControlDevices() {
    return Boolean(state.auth.user && ["user", "operator", "admin"].includes(state.auth.user.role));
  }

  function isDeviceOnline(id, now = Date.now()) {
    if (state.simulationEnabled) return deviceIds.includes(id);
    const lastSeen = Number(state.lastSeen[id]);
    return state.connected && state.online[id] === true && Number.isFinite(lastSeen) && now - lastSeen <= deviceOnlineTimeout;
  }

  function markDevicesOffline() {
    deviceIds.forEach(id => { state.online[id] = false; });
  }

  function clearTelemetryState() {
    Object.keys(state.main).forEach(key => { state.main[key] = key === "cameraOffAt" ? 0 : null; });
    Object.keys(state.power).forEach(key => { state.power[key] = null; });
    Object.keys(state.flat).forEach(key => { state.flat[key] = null; });
    state.lastSeen = {};
    markDevicesOffline();
  }

  function applyTelemetrySnapshot(target,payload){
    Object.keys(target).forEach(key=>{target[key]=Object.prototype.hasOwnProperty.call(payload,key)?payload[key]:(key==="cameraOffAt"?0:null)});
  }

  function simulationTick() {
    if (!state.simulationEnabled) return;
    const phase = Date.now() / 60000;
    Object.assign(state.main, {
      dht_temperature:22 + Math.sin(phase) * 1.8,
      dht_humidity:48 + Math.cos(phase * .72) * 6,
      power_output:11.8 + Math.sin(phase * .45) * 1.2,
      rain_analog:860 + Math.round(Math.sin(phase * .3) * 18),
      rain_detected:false, heater:state.main.heater ?? false, fan:state.main.fan ?? false, mosfet:state.main.mosfet ?? true, camera:state.main.camera ?? false, bluetooth:state.main.bluetooth ?? true,
      heater_mode:state.main.heater_mode ?? true, fan_mode:state.main.fan_mode ?? true, fan_threshold:state.main.fan_threshold ?? 40, cameraDurationMinutes:state.main.cameraDurationMinutes ?? 60, cameraOffAt:state.main.cameraOffAt ?? 0,
      roof:state.main.roof ?? "closed", roofPosition:hasNumber(state.main.roofPosition) ? state.main.roofPosition : 0
    });
    Object.assign(state.power, {
      power_input:3.1 + Math.sin(phase * .38) * .5,
      battery_percent:76 + Math.sin(phase * .08) * 2,
      current_input:.42 + Math.sin(phase * .5) * .08,
      buck_current:.81 + Math.cos(phase * .43) * .1,
      buck_power:12.2 + Math.sin(phase * .31) * .6,
      voltage_input:15.1, buck_voltage:14.08, temperature:34 + Math.sin(phase * .2), pwm:62,
      fan:state.power.fan ?? false, enable_fan:state.power.enable_fan ?? true, mode:state.power.mode ?? 1, daily_energy:.07, total_energy:490.7, buck_efficiency:94,
      voltage_battery_min:10, voltage_battery_max:14.4, current_charging:2, temperature_fan:60
    });
    Object.assign(state.flat, { humidity:state.main.dht_humidity, servo:state.flat.servo ?? false, servoMoving:state.flat.servoMoving ?? false, led:state.flat.led ?? false, heater:state.flat.heater ?? false, heater_mode:state.flat.heater_mode ?? true, angle:hasNumber(state.flat.angle) ? state.flat.angle : 0, maxAngle:state.flat.maxAngle ?? 300, brightness:state.flat.brightness ?? 68, humi_threshold:state.flat.humi_threshold ?? 70, heater_power:state.flat.heater_power ?? 50 });
    const now = Date.now();
    deviceIds.forEach(id => { state.online[id] = true; state.lastSeen[id] = now; });
    pushHistory("esp32-001", state.main); pushHistory("mppt-001", state.power);
    render(); drawCharts();
  }

  function setSimulationEnabled(enabled) {
    const next = Boolean(enabled);
    if (next === state.simulationEnabled) return;
    if (!next) stopSimulationAnimation();
    clearInterval(state.simulationTimer);
    state.simulationTimer = 0;
    state.simulationEnabled = next;
    const toggle = $("#simulation-toggle");
    toggle?.setAttribute("aria-checked", String(next));
    toggle?.classList.toggle("on", next);
    const label = toggle?.querySelector("span"); if (label) label.textContent = next ? "已开启" : "关闭";
    $("#connection-form")?.classList.toggle("disabled", next);
    if (next) {
      disconnectEventStream();
      buildHistory();
      simulationTick();
      state.simulationTimer = setInterval(simulationTick, 5000);
      addLog("SIMULATION", "测试数据注入已开启；不会发送真实设备指令", "warn");
    } else {
      clearTelemetryState();
      render(); drawCharts();
      addLog("SYSTEM", "测试数据已清除，恢复真实离线状态", "ok");
    }
  }

  function updateConnectionUI() {
    const pill = $("#connection-pill");
    if (pill) {
      pill.classList.toggle("offline", !state.connected && !state.simulationEnabled);
      pill.querySelector("b").textContent = state.simulationEnabled ? "SIMULATION" : state.connected ? "LIVE" : "OFFLINE";
      pill.querySelector("small").textContent = state.simulationEnabled ? "测试数据注入" : state.connected ? "后端实时通道已连接" : "等待连接";
      const pillDot=pill.querySelector(".status-dot");pillDot?.classList.toggle("offline",!state.connected&&!state.simulationEnabled);pillDot?.classList.toggle("simulated",state.simulationEnabled);
    }
    const now = Date.now();
    const count = deviceIds.filter(id => isDeviceOnline(id, now)).length;
    const sideStatus = $(".side-status");
    const side = $(".side-status b"); if (side) side.textContent = `${count} / ${deviceIds.length} 设备在线`;
    sideStatus?.classList.toggle("offline", count === 0);
    sideStatus?.classList.toggle("partial", count > 0 && count < deviceIds.length);
    const latestSeen = Math.max(0, ...Object.values(state.lastSeen).map(Number).filter(Number.isFinite));
    const syncText = state.simulationEnabled ? `模拟更新于 ${timestamp(latestSeen)}` : latestSeen ? `同步于 ${timestamp(latestSeen)}` : state.connected ? "等待设备数据" : "实时通道未连接";
    setText("#side-last-sync", syncText);
    setText("#hero-time", latestSeen ? `最后更新 · ${timestamp(latestSeen)}` : "最后更新 · 尚未收到遥测");
    const footerDot = $("#connection-hint .status-dot"); if (footerDot){footerDot.classList.toggle("offline",!state.connected&&!state.simulationEnabled);footerDot.classList.toggle("simulated",state.simulationEnabled)}
  }

  function applyConnection() {
    if (!state.controller.configured && state.auth.user && !state.simulationEnabled) { autoAssignController(); return; }
    if (state.simulationEnabled) { toast("测试数据注入已开启", "关闭模拟开关后才能连接真实设备。", "error", "background"); return; }
    if (!state.auth.user) { toast("需要登录", "登录后才能建立实时通道。", "error"); routeTo("login"); return; }
    if (!state.controller.configured) { toast("尚未获得硬件套组", "请先在连接设置中提交申请并等待管理员批准。", "error", "background"); loadControllerConnection(); return; }
    connectEventStream();
  }

  function connectEventStream() {
    if (!state.auth.user || state.simulationEnabled) return;
    disconnectEventStream();
    // A live connection must start from an empty telemetry state; never carry simulated values into LIVE mode.
    clearTelemetryState();
    buildHistory();
    renderHumiditySparkline();
    drawCharts();
    state.online = { "esp32-001": false, "mppt-001": false, "ef-001": false };
    if (isNativeRuntime()) {
      nativeEventBuffer = "";
      nativeEventUnlisten?.();
      nativeEventUnlisten = null;
      nativeInvoke("start_sse").then(() => {
        state.connected = true;
        state.eventSource = { readyState: 1, close: () => nativeInvoke("stop_sse").catch(() => {}) };
        updateConnectionUI();
        syncRealtimeSnapshot();
      }).catch(error => {
        state.connected = false;
        addLog("SYSTEM", error?.message || "Native event stream unavailable", "error");
        updateConnectionUI();
      });
      window.__TAURI__.event.listen("astra://event", event => {
        nativeEventBuffer += String(event.payload || "");
        const frames = nativeEventBuffer.split(/\n\n/);
        nativeEventBuffer = frames.pop() || "";
        frames.forEach(frame => {
          const line = frame.split(/\n/).find(item => item.startsWith("data:"));
          if (!line) return;
          try {
            const message = JSON.parse(line.slice(5).trim());
            if (message?.topic) handleMessage(message.topic, message.payload);
          } catch (_) { /* partial or keepalive frame */ }
        });
      }).then(unlisten => { nativeEventUnlisten = unlisten; }).catch(() => {});
      return;
    }
    const source = new EventSource("/api/v1/events/stream", { withCredentials:true });
    state.eventSource = source;
    source.onopen = () => {
      if (state.eventSource !== source) return;
      state.connected = true;
      addLog("SYSTEM", "后端实时通道已连接", "ok");
      syncRealtimeSnapshot();
      closeSettings(); updateConnectionUI();
    };
    source.onmessage = event => {
      if (state.eventSource !== source) return;
      try {
        const message = JSON.parse(event.data);
        if (message?.topic) handleMessage(message.topic, message.payload);
      } catch (error) { console.warn("Invalid realtime event", error); }
    };
    source.onerror = () => {
      if (state.eventSource !== source) return;
      state.connected = false;
      markDevicesOffline(); renderDeviceStatuses(); updateConnectionUI();
    };
  }

  function disconnectEventStream() {
    if (state.eventSource) { state.eventSource.close(); state.eventSource = null; }
    if (isNativeRuntime()) { nativeInvoke("stop_sse").catch(() => {}); nativeEventUnlisten?.(); nativeEventUnlisten = null; }
    state.connected = false;
    markDevicesOffline();
  }

  async function syncRealtimeSnapshot() {
    if (!state.auth.user || state.simulationEnabled) return;
    try {
      const devices = await apiRequest("/api/v1/devices");
      const byId = Object.fromEntries((Array.isArray(devices) ? devices : []).map(device => [device.device_id, device]));
      const latest = await Promise.all(deviceIds.filter(deviceId => byId[deviceId]).map(async deviceId => {
        try { return [deviceId, await apiRequest(`/api/v1/devices/${deviceId}/latest`)]; }
        catch (error) { if (error.status !== 404) throw error; return [deviceId, null]; }
      }));
      latest.forEach(([deviceId, snapshot]) => {
        const device = byId[deviceId];
        const seen = apiTimestamp(device?.last_seen || snapshot?.ts);
        state.lastSeen[deviceId] = seen;
        state.online[deviceId] = device?.last_status === "online" && Date.now() - seen <= deviceOnlineTimeout;
        if (!snapshot?.payload || typeof snapshot.payload !== "object") return;
        if (deviceId === "esp32-001") applyTelemetrySnapshot(state.main, snapshot.payload);
        if (deviceId === "mppt-001") applyTelemetrySnapshot(state.power, snapshot.payload);
        if (deviceId === "ef-001") applyTelemetrySnapshot(state.flat, snapshot.payload);
      });
      render(); updateConnectionUI();
    } catch (error) {
      console.warn("Unable to synchronize latest device state", error);
    }
  }

  function handleMessage(topic, messagePayload) {
    const parts = topic.split("/");
    const device = parts[1], channel = parts[2];
    const raw = typeof messagePayload === "string" ? messagePayload : JSON.stringify(messagePayload ?? "");
    let payload = messagePayload;
    if (typeof messagePayload === "string") {
      try { payload = JSON.parse(messagePayload); } catch (_) { /* status may be plain text */ }
    }
    const isPrimaryDevice = !!device && Object.prototype.hasOwnProperty.call(state.online, device);
    const wasOnline = isPrimaryDevice ? !!state.online[device] : false;
    const wasRaining = bool(state.main.rain_detected), previousBluetooth = state.main.bluetooth;
    if (isPrimaryDevice) { state.online[device] = true; state.lastSeen[device] = Date.now(); }
    if (channel === "status") {
      if (isPrimaryDevice) {
        state.online[device] = payload&&typeof payload === "object"&&!Array.isArray(payload) ? payload.status !== "offline" : raw !== "offline";
        if (wasOnline && !state.online[device]) toast("设备掉线", `${device} 已报告离线状态。`, "error", "background");
      }
    }
    if (channel === "telemetry" && payload&&typeof payload === "object"&&!Array.isArray(payload)) {
      if (device === "esp32-001") applyTelemetrySnapshot(state.main, payload);
      if (device === "mppt-001") applyTelemetrySnapshot(state.power, payload);
      if (device === "ef-001") applyTelemetrySnapshot(state.flat, payload);
      if (device === "esp32-001" && !wasRaining && bool(state.main.rain_detected)) toast("雨水预警", "现场雨水传感器检测到降水，请暂停观测并关闭屋顶。", "error", "background");
      if (device === "esp32-001" && Object.prototype.hasOwnProperty.call(payload,"bluetooth") && previousBluetooth !== state.main.bluetooth) {
        const connected = bool(state.main.bluetooth);
        $("#onstep-bluetooth-status")?.classList.remove("pending");
        toast(connected?"蓝牙连接成功":"蓝牙已断开", connected?"OnStep 蓝牙链路已由设备遥测确认。":"OnStep 已报告蓝牙链路断开。", connected?"ok":"error", "background");
      }
      pushHistory(device, payload);
    } else if(channel === "telemetry") {
      if(device==="esp32-001")applyTelemetrySnapshot(state.main,{});
      if(device==="mppt-001")applyTelemetrySnapshot(state.power,{});
      if(device==="ef-001")applyTelemetrySnapshot(state.flat,{});
      addLog(device,"遥测 JSON 无效，已清除该设备的过期显示值","warn");
    }
    if (channel === "reported") {
      const message = payload&&typeof payload === "object"&&!Array.isArray(payload) ? (payload.error || `${payload.key || payload.type || "reported"}: ${payload.value ?? payload.ok ?? "ok"}`) : raw;
      addLog(device, message, payload?.ok === false ? "warn" : "ok");
      if (payload&&typeof payload === "object"&&!Array.isArray(payload) && (payload.error || payload.ok === false)) toast("设备异常", `${device} · ${message}`, "error", "background");
    }
    render(); updateConnectionUI();
  }

  function stopSimulationAnimation() {
    simulationAnimationTimers.forEach(timer => clearInterval(timer));
    simulationAnimationTimers.clear();
  }

  function animateSimulation(update, duration = 700) {
    const started = performance.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / duration);
      update(progress);
      render();
      if (progress >= 1) { clearInterval(timer); simulationAnimationTimers.delete(timer); }
    }, 50);
    simulationAnimationTimers.add(timer);
    update(0); render();
  }

  function simulateCommand(device, payload, description) {
    const entries = Object.entries(payload || {});
    const command = payload?.command || (entries.length === 1 ? entries[0][0] : "settings");
    const value = entries.length === 1 ? entries[0][1] : undefined;
    const booleanValue = payload?.state ?? payload?.enabled ?? value;
    const setMain = (field, next) => { state.main[field] = bool(next); };
    const setPower = (field, next) => { state.power[field] = bool(next); };
    const setFlat = (field, next) => { state.flat[field] = bool(next); };
    if (device === "esp32-001") {
      if (["camera", "heater", "fan", "mosfet", "bluetooth"].includes(command)) setMain(command, booleanValue);
      else if (command === "camera_timer") { state.main.cameraDurationMinutes = clamp(Number(payload.minutes), 1, 1439); if (state.main.camera) state.main.cameraOffAt = Date.now() + state.main.cameraDurationMinutes * 60000; }
      else if (command === "heater_mode" || command === "fan_mode") state.main[command] = payload.mode === "auto";
      else if (command === "fan_threshold") state.main.fan_threshold = Number(payload.value);
      else if (command === "motor_forward" || command === "motor_reverse") {
        const from = hasNumber(state.main.roofPosition) ? Number(state.main.roofPosition) : (state.main.roof === "open" ? 100 : 0);
        const to = command === "motor_forward" ? 100 : 0;
        state.main.roof = "moving";
        animateSimulation(progress => { state.main.roofPosition = from + (to - from) * progress; if (progress >= 1) state.main.roof = to ? "open" : "closed"; }, 1200);
      } else if (command === "motor_stop") { stopSimulationAnimation(); const position = Number(state.main.roofPosition || 0); state.main.roof = position >= 98 ? "open" : position <= 2 ? "closed" : "moving"; }
    } else if (device === "mppt-001") {
      if (command === "settings") Object.entries(payload).forEach(([key, item]) => { if (key in state.power) state.power[key] = Number(item); });
      else if (command === "mode") state.power.mode = Number(payload.value ?? payload.mode ?? 1);
      else if (["fan", "enable_fan"].includes(command)) setPower(command, booleanValue);
      else if (command in state.power) state.power[command] = Number(payload.value ?? value);
    } else if (device === "ef-001") {
      if (command === "led") setFlat("led", booleanValue);
      else if (command === "heater_mode") setFlat("heater_mode", booleanValue);
      else if (command === "brightness") state.flat.brightness = clamp(Number(payload.value), 0, 100);
      else if (command === "humi_threshold") state.flat.humi_threshold = clamp(Number(payload.value), 0, 100);
      else if (command === "heater_power") state.flat.heater_power = clamp(Number(payload.value), 0, 100);
      else if (command === "angle") state.flat.maxAngle = clamp(Number(payload.value), 0, 300);
      else if (command === "servo") {
        const from = hasNumber(state.flat.angle) ? Number(state.flat.angle) : 0;
        const to = bool(payload.state) ? Number(state.flat.maxAngle || 300) : 0;
        state.flat.servoMoving = true;
        animateSimulation(progress => { state.flat.angle = from + (to - from) * progress; if (progress >= 1) { state.flat.servo = to > 0; state.flat.servoMoving = false; } }, 1000);
      }
    }
    addLog(device, `${description} · 模拟执行（未发送）`, "ok");
    toast("模拟指令已执行", description, "ok");
    render();
    return true;
  }

  function sendCommand(device, payload, description = "设备指令") {
    if (!state.auth.user || !["user","operator","admin"].includes(state.auth.user.role)) { toast("权限不足", "当前账户没有设备控制权限。", "error"); return false; }
    if (state.simulationEnabled) return simulateCommand(device, payload, description);
    if (!isDeviceOnline(device)) { toast("设备离线", `${device} 当前没有有效在线遥测。`, "error", "background"); return false; }
    if (!state.connected) { toast("设备未连接", "后端实时通道尚未连接。", "error"); return false; }
    const entries = Object.entries(payload || {});
    let command = payload?.command;
    let args = command ? Object.fromEntries(entries.filter(([key]) => key !== "command")) : {};
    if (!command && entries.length === 1) {
      command = entries[0][0];
      const value = entries[0][1];
      args = { value, state:value, enabled:value };
    } else if (!command) {
      command = "settings";
      args = payload;
    }
    apiRequest(`/api/v1/devices/${encodeURIComponent(device)}/commands`, {
      method:"POST", body:JSON.stringify({ command, args })
    }).then(result => {
      addLog(device, `${description} · ${result.status === "sent" ? "已发送" : "已排队"}`, "ok");
      toast("指令已提交", description, "ok");
    }).catch(error => toast("指令发送失败", error.message, "error"));
    return true;
  }

  function render() {
    const m = state.main, p = state.power, f = state.flat;
    const mainOnline = isDeviceOnline("esp32-001"), powerOnline = isDeviceOnline("mppt-001"), flatOnline = isDeviceOnline("ef-001");
    const mainValue = value => mainOnline && hasNumber(value), powerValue = value => powerOnline && hasNumber(value), flatValue = value => flatOnline && hasNumber(value);
    setHtml("#overview-temp", `${mainValue(m.dht_temperature)?fmt(m.dht_temperature):"--"}<sup>°C</sup>`);
    setHtml("#overview-humidity", `${mainValue(m.dht_humidity)?fmt(m.dht_humidity):"--"}<sup>%</sup>`);
    setText("#overview-battery", powerValue(p.battery_percent) ? `${Math.round(p.battery_percent)}%` : "--");
    const roofValid = mainOnline && typeof m.roof === "string";
    const roofText = !roofValid ? "离线" : m.roof === "open" ? "已开启" : m.roof === "moving" ? "运行中" : m.roof === "closed" ? "已关闭" : "状态未知";
    setText("#overview-roof", roofText);
    setHtml("#overview-battery-card", `${powerValue(p.battery_percent)?Math.round(p.battery_percent):"--"}<sup>%</sup>`);
    setHtml("#overview-load", `${mainValue(m.power_output)?fmt(m.power_output):"--"}<sup>W</sup>`);
    setText("#overview-temp-note", !mainOnline ? "设备离线 · 暂无数据" : mainValue(m.dht_temperature) ? "实时设备遥测" : "暂无温度遥测");
    const dewPoint = mainValue(m.dht_temperature) && mainValue(m.dht_humidity) ? dewPointC(m.dht_temperature,m.dht_humidity) : NaN;
    const dewDistance = Number.isFinite(dewPoint) ? Number(m.dht_temperature)-dewPoint : NaN;
    setText("#overview-humidity-note", !mainOnline ? "设备离线 · 暂无数据" : Number.isFinite(dewDistance) ? `露点差 ${dewDistance.toFixed(1)}°C` : "暂无温湿度遥测");
    setText("#overview-battery-note", !powerOnline ? "设备离线 · 暂无数据" : powerValue(p.buck_current) ? (Number(p.buck_current)>.05?"检测到充电电流":"未检测到充电电流") : "暂无充电电流遥测");
    setText("#overview-load-note", !mainOnline ? "设备离线 · 暂无数据" : mainValue(m.power_output) ? "实时设备遥测" : "暂无负载遥测");
    const solarLamp = $("#hero-solar");
    if (solarLamp) {
      const solarValid = powerValue(p.power_input), isGenerating = solarValid && p.power_input > .3;
      solarLamp.classList.toggle("generating", isGenerating);
      solarLamp.classList.toggle("idle", solarValid&&!isGenerating);
      solarLamp.classList.toggle("offline", !solarValid);
      solarLamp.setAttribute("aria-label", !solarValid?"能源设备离线":isGenerating?"正在发电":"未检测到光伏输入");
      solarLamp.setAttribute("title", solarLamp.getAttribute("aria-label"));
    }
    const temperatureIndicator = $("#hero-temperature-icon");
    if (temperatureIndicator) {
      const temperatureValid = mainValue(m.dht_temperature);
      const temperature = Number(m.dht_temperature);
      const temperatureState = temperature > 40 ? "hot" : temperature >= 30 ? "warm" : temperature >= 20 ? "normal" : "cold";
      temperatureIndicator.classList.remove("cold", "normal", "warm", "hot", "active", "offline");
      if (temperatureValid) temperatureIndicator.classList.add(temperatureState, "active");
      else temperatureIndicator.classList.add("offline");
      temperatureIndicator.setAttribute("aria-label", temperatureValid ? `温度 ${fmt(temperature)} 摄氏度` : "温度数据离线");
      temperatureIndicator.setAttribute("title", temperatureValid ? `温度 ${fmt(temperature)}°C` : "温度数据离线");
    }
    const rainIndicator = $("#hero-rain-icon");
    if (rainIndicator) {
      const rainValid = mainOnline && m.rain_detected !== null && m.rain_detected !== undefined;
      rainIndicator.classList.toggle("raining", rainValid && bool(m.rain_detected));
      rainIndicator.classList.toggle("dry", rainValid && !bool(m.rain_detected));
      rainIndicator.classList.toggle("offline", !rainValid);
      rainIndicator.setAttribute("aria-label", !rainValid?"雨水传感器离线":bool(m.rain_detected)?"检测到雨水":"未检测到雨水");
      rainIndicator.setAttribute("title", rainIndicator.getAttribute("aria-label"));
    }
    setText("#node-main-value", mainValue(m.dht_temperature)?`${fmt(m.dht_temperature)}°C`:"--");
    setText("#node-power-value", powerValue(p.battery_percent)?`${Math.round(p.battery_percent)}%`:"--");
    setText("#node-flat-value", flatValue(f.angle)?`${Math.round(f.angle)}°`:"--");
    setHtml("#battery-big", `${powerValue(p.battery_percent)?Math.round(p.battery_percent):"--"}<sup>%</sup>`);
    setText("#charge-state", !powerOnline?"设备离线":powerValue(p.buck_current)?(Number(p.buck_current)>.05?"检测到充电电流":"未检测到充电电流"):"暂无充电数据");
    const chargeDot=$("#charge-state")?.parentElement?.querySelector(".status-dot");if(chargeDot){chargeDot.classList.toggle("offline",!powerOnline);chargeDot.classList.toggle("idle",powerOnline&&(!powerValue(p.buck_current)||Number(p.buck_current)<=.05))}
    setText("#battery-min", powerValue(p.voltage_battery_min)?`${fmt(p.voltage_battery_min)}V`:"--"); setText("#battery-max", powerValue(p.voltage_battery_max)?`${fmt(p.voltage_battery_max)}V`:"--");
    setText("#flow-input", powerValue(p.power_input)?`${fmt(p.power_input)}W`:"--"); setText("#flow-efficiency", powerValue(p.buck_efficiency)?`${Math.round(p.buck_efficiency)}%`:"--"); setText("#flow-output", powerValue(p.buck_power)?`${fmt(p.buck_power)}W`:"--");
    setText("#p-vin", powerValue(p.voltage_input)?fmt(p.voltage_input,2):"--"); setText("#p-iin", powerValue(p.current_input)?fmt(p.current_input,2):"--"); setText("#p-vout", powerValue(p.buck_voltage)?fmt(p.buck_voltage,2):"--"); setText("#p-iout", powerValue(p.buck_current)?fmt(p.buck_current,2):"--");
    setText("#p-temp", powerValue(p.temperature)?rounded(p.temperature):"--"); setText("#p-pwm", powerValue(p.pwm)?rounded(p.pwm):"--"); setText("#p-daily", powerValue(p.daily_energy)?fmt(p.daily_energy,2):"--"); setText("#p-total", powerValue(p.total_energy)?fmt(p.total_energy,1):"--");
    setHtml("#weather-temp", `${mainValue(m.dht_temperature)?fmt(m.dht_temperature):"--"}<sup>°C</sup>`); setHtml("#weather-humidity", `${mainValue(m.dht_humidity)?fmt(m.dht_humidity):"--"}<sup>%</sup>`); setHtml("#weather-humidity-primary", `${mainValue(m.dht_humidity)?fmt(m.dht_humidity):"--"}<sup>%</sup>`);
    setText("#dewpoint-distance", Number.isFinite(dewDistance)?`${dewDistance>=0?"+":""}${dewDistance.toFixed(1)}°C`:"--");
    const rainValid = mainOnline && m.rain_detected !== null && m.rain_detected !== undefined;
    setText("#weather-rain", !rainValid?"离线":bool(m.rain_detected)?"有雨":"无雨"); setText("#weather-rain-analog", mainValue(m.rain_analog)?rounded(m.rain_analog):"--"); renderHumiditySparkline();
    setText("#main-output-value", mainValue(m.power_output)?`${fmt(m.power_output)} W 负载`:"暂无负载遥测");
    setText("#roof-position", mainValue(m.roofPosition)?`${Math.round(m.roofPosition)}%`:"--"); setText("#roof-state-chip", roofText); setText("#roof-detail", roofValid?"来自设备遥测":"设备离线 · 暂无遥测");
    const flatLedKnown=flatOnline&&f.led!==null&&f.led!==undefined;
    setText("#flat-led-state", !flatOnline?"设备离线":!flatLedKnown?"暂无 LED 状态遥测":f.led?`已开启${flatValue(f.brightness)?` · ${Math.round(f.brightness)}%`:""}`:"当前关闭");
    setText("#quick-flat-led-state", !flatOnline ? "设备离线" : !flatLedKnown ? "暂无 LED 状态遥测" : f.led ? (flatValue(f.brightness) ? `亮度 ${Math.round(f.brightness)}%` : "已开启 · 暂无亮度遥测") : "当前关闭");
    setText("#profile-mode", state.simulationEnabled?"SIMULATION 测试数据":"后端实时通道");
    [
      ["#set-battery-min", p.voltage_battery_min, powerOnline], ["#set-battery-max", p.voltage_battery_max, powerOnline],
      ["#set-charge-current", p.current_charging, powerOnline], ["#set-fan-temp", p.temperature_fan, powerOnline]
    ].forEach(([selector,value,online])=>{const input=$(selector);if(input&&document.activeElement!==input)input.value=online&&hasNumber(value)?String(value):""});
    [
      ["#brightness","#brightness-value",f.brightness], ["#humidity-threshold","#humidity-threshold-value",f.humi_threshold],
      ["#heater-power","#heater-power-value",f.heater_power]
    ].forEach(([inputSelector,labelSelector,value])=>{const input=$(inputSelector),valid=flatOnline&&hasNumber(value);if(input&&document.activeElement!==input)input.value=valid?String(value):"0";setText(labelSelector,valid?`${Math.round(value)}%`:"--")});
    renderFlatVisual();
    $(".battery-gauge")?.classList.toggle("has-telemetry",powerValue(p.battery_percent));
    $$(".battery-gauge i").forEach((segment, index) => { segment.style.background = powerValue(p.battery_percent)&&p.battery_percent >= (index + 1) * 20 ? "#eeefea" : "#292a27"; });
    const roofDiagram = $(".roof-diagram");
    if (roofDiagram) { roofDiagram.style.setProperty("--roof-progress", String(mainValue(m.roofPosition)?clamp(m.roofPosition / 100, 0, 1):0));roofDiagram.classList.toggle("telemetry-offline",!mainValue(m.roofPosition)); }
    renderToggles(); renderEnvironmentControls(); renderDeviceStatuses(); updateConnectionUI();
  }

  function renderFlatVisual() {
    const f = state.flat;
    const online = isDeviceOnline("ef-001"), angleValid = online && hasNumber(f.angle), limitValid = online && hasNumber(f.maxAngle) && Number(f.maxAngle)>0;
    const servoKnown=online&&f.servo!==null&&f.servo!==undefined,ledKnown=online&&f.led!==null&&f.led!==undefined;
    const progress = angleValid && limitValid ? clamp(f.angle / f.maxAngle, 0, 1) : 0;
    const disc = $("#panel-disc");
    if (disc) {
      disc.classList.toggle("open", online && progress > .96);
      disc.classList.toggle("moving", online && !!f.servoMoving);
      disc.classList.toggle("lit", online && !!f.led);
      disc.classList.toggle("telemetry-offline", !angleValid);
      disc.style.setProperty("--panel-tilt", `${-68 * progress}deg`);
      disc.style.setProperty("--panel-shift", `${20 * progress}px`);
      const ledLevel = online && f.led && hasNumber(f.brightness) ? clamp(f.brightness / 100, 0, 1) : 0;
      disc.style.setProperty("--led-level", String(ledLevel));
      disc.style.setProperty("--led-brightness", String(.72 + ledLevel * .418392857));
      disc.style.setProperty("--led-glow", `${20 + ledLevel * 140}px`);
    }
    $(".flat-hero")?.classList.toggle("heating", online && !!f.heater);
    const panelButton = $("#toggle-panel");
    panelButton?.classList.toggle("on", servoKnown && (!!f.servo || !!f.servoMoving));
    if (panelButton) panelButton.innerHTML = !online ? `设备离线 <span>—</span>` : !servoKnown ? `暂无舵机状态 <span>—</span>` : f.servoMoving ? `舵机运行中 <span>${angleValid?Math.round(f.angle):"--"}°</span>` : f.servo ? `收起平场板 <span>↙</span>` : `展开平场板 <span>↗</span>`;
    setHtml("#flat-angle-big", `${angleValid?Math.round(f.angle):"--"}<sup>°</sup>`);
    setText("#flat-position-label", !online ? "设备离线 · 暂无角度遥测" : !servoKnown ? (angleValid?`角度 ${Math.round(f.angle)}° · 舵机状态未知`:"暂无舵机与角度遥测") : f.servoMoving ? `舵机运行中 · ${angleValid?Math.round(f.angle):"--"}°` : f.servo ? "平场板已展开" : "平场板已收起");
    setText("#flat-servo-state", !online ? "设备离线" : !servoKnown ? "暂无舵机状态遥测" : f.servoMoving ? `运行中 · ${angleValid?Math.round(f.angle):"--"}°` : f.servo ? `已展开 · ${angleValid?Math.round(f.angle):"--"}°` : "当前已收起");
    const ledButton = $("#toggle-flat-led");
    if (ledButton) ledButton.innerHTML = !online ? `设备离线 <span>—</span>` : !ledKnown ? `暂无 LED 状态 <span>—</span>` : f.led ? `关闭平场灯 <span>↙</span>` : `开启平场灯 <span>↗</span>`;
    const limitRange = $("#servo-limit-range");
    if (limitRange && document.activeElement !== limitRange) limitRange.value = limitValid ? f.maxAngle : 0;
    setText("#servo-limit-value", limitValid?`${Math.round(f.maxAngle)}°`:"--");
    $("#angle-limit-control")?.style.setProperty("--limit-progress", `${limitValid?clamp(f.maxAngle / 300 * 100, 0, 100):0}%`);
  }

  function renderToggles() {
    const mainOnline=isDeviceOnline("esp32-001"),powerOnline=isDeviceOnline("mppt-001"),flatOnline=isDeviceOnline("ef-001");
    const canControl = canControlDevices();
    const mainMap = { camera:mainOnline&&state.main.camera, heater:mainOnline&&state.main.heater, fan:mainOnline&&state.main.fan, mosfet:mainOnline&&state.main.mosfet, flatLed:flatOnline&&state.flat.led };
    $$('[data-toggle]').forEach(button => { const key=button.dataset.toggle,source=key==="flatLed"?state.flat:state.main,field=key==="flatLed"?"led":key,online=key==="flatLed"?flatOnline:mainOnline,known=online&&source[field]!==null&&source[field]!==undefined,on=known&&!!mainMap[key];button.classList.toggle("on",on);button.classList.toggle("unknown",online&&!known);button.setAttribute("aria-pressed",known?String(on):"false");button.disabled=!canControl||!known });
    $$('[data-mppt-toggle]').forEach(button=>{const known=powerOnline&&state.power[button.dataset.mpptToggle]!==null&&state.power[button.dataset.mpptToggle]!==undefined;button.classList.toggle("on",known&&bool(state.power[button.dataset.mpptToggle]));button.classList.toggle("unknown",powerOnline&&!known);button.disabled=!canControl||!known});
    const algorithmKnown=powerOnline&&state.power.mode!==null&&state.power.mode!==undefined,mpptEnabled=algorithmKnown&&bool(state.power.mode);
    setText("#mppt-algorithm-title",algorithmKnown?(mpptEnabled?"MPPT 算法":"PWM 算法"):"算法状态未知");
    setText("#mppt-algorithm-subtitle",algorithmKnown?(mpptEnabled?"最大功率点追踪":"PWM 调制模式"):"等待能源设备遥测");
    const fanModeKnown=powerOnline&&state.power.enable_fan!==null&&state.power.enable_fan!==undefined,automaticFan=fanModeKnown&&bool(state.power.enable_fan);
    $$('[data-mppt-fan-mode]').forEach(button=>{const active=fanModeKnown&&button.dataset.mpptFanMode===(automaticFan?"auto":"manual");button.classList.toggle("active",active);button.disabled=!canControl||!fanModeKnown});
    setText("#mppt-fan-mode-note",!fanModeKnown?"等待能源设备遥测":automaticFan?`自动模式 · ${hasNumber(state.power.temperature_fan)?Math.round(state.power.temperature_fan)+"°C":"--"} 阈值`:"手动模式 · 由开关直接控制");
    const fanKnown=powerOnline&&state.power.fan!==null&&state.power.fan!==undefined,fanOn=fanKnown&&bool(state.power.fan),fanSwitch=$('[data-mppt-toggle="fan"]');
    setText("#mppt-fan-state-title",fanKnown?(fanOn?"风扇开启":"风扇关闭"):"风扇状态未知");
    setText("#mppt-fan-state-subtitle",fanModeKnown?(automaticFan?"自动策略控制":"手动开关"):"等待控制模式遥测");
    if(fanSwitch)fanSwitch.disabled=!canControl||!fanKnown||automaticFan;
    $("#set-fan-temp")?.toggleAttribute("disabled",!canControl||!powerOnline||!fanModeKnown||!automaticFan);
    $("#apply-mppt-fan-temp")?.toggleAttribute("disabled",!canControl||!powerOnline||!fanModeKnown||!automaticFan);
    $$('[data-flat-toggle]').forEach(button=>{const field=button.dataset.flatToggle==="led"?"led":"heater_mode",known=flatOnline&&state.flat[field]!==null&&state.flat[field]!==undefined;button.classList.toggle("on",known&&bool(state.flat[field]));button.classList.toggle("unknown",flatOnline&&!known);button.disabled=!canControl||!known});
    $("#save-power-settings")?.toggleAttribute("disabled",!canControl||!powerOnline);
    $("#toggle-panel")?.toggleAttribute("disabled",!canControl||!flatOnline||state.flat.servo===null||state.flat.servo===undefined);
    $$('[data-roof]').forEach(button=>button.disabled=!canControl||!mainOnline||typeof state.main.roof!=="string");
    $$('[data-onstep],[data-camera-duration],#apply-camera-duration,#fan-threshold').forEach(button=>button.disabled=!canControl||!mainOnline);
    $$('[data-device-mode]').forEach(button=>{const field=button.dataset.deviceMode==="heater"?"heater_mode":"fan_mode";button.disabled=!canControl||!mainOnline||state.main[field]===null||state.main[field]===undefined});
    $$('#servo-limit-range,#brightness,#humidity-threshold,#heater-power').forEach(input=>input.disabled=!canControl||!flatOnline);
    $$('.settings-card [data-number-stepper] input,.settings-card [data-step-direction]').forEach(input=>input.disabled=!canControl||!powerOnline);
  }

  function durationLabel(minutes) {
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    if (hours && rest) return `${hours}小时${rest}分钟`;
    if (hours) return `${hours}小时`;
    return `${rest}分钟`;
  }

  function renderEnvironmentControls() {
    const m = state.main, online=isDeviceOnline("esp32-001");
    const canControl = canControlDevices();
    $$('[data-device-mode]').forEach(button => {
      const automatic = button.dataset.deviceMode === "heater" ? !!m.heater_mode : !!m.fan_mode;
      const known = online && (button.dataset.deviceMode === "heater" ? m.heater_mode!==null : m.fan_mode!==null);
      button.classList.toggle("active", known && button.dataset.modeValue === (automatic ? "auto" : "manual"));
    });
    setText("#heater-mode-state", !online?"设备离线":m.heater_mode===null?"暂无模式遥测":m.heater_mode?"自动模式":"手动模式");
    setText("#fan-mode-state", !online?"设备离线":m.fan_mode===null?"暂无模式遥测":`${m.fan_mode?"自动":"手动"}${hasNumber(m.fan_threshold)?` · 阈值 ${Math.round(m.fan_threshold)}°C`:""}`);
    setText("#fan-threshold-value", online&&hasNumber(m.fan_threshold)?`${Math.round(m.fan_threshold)}°C`:"--");
    const bluetoothStatus = $("#onstep-bluetooth-status"), bluetoothConnected = isDeviceOnline("esp32-001") && bool(m.bluetooth);
    if (bluetoothStatus) {
      bluetoothStatus.classList.toggle("connected", bluetoothConnected);
      bluetoothStatus.disabled = !canControl || !isDeviceOnline("esp32-001");
      bluetoothStatus.setAttribute("aria-pressed",String(bluetoothConnected));
      bluetoothStatus.setAttribute("aria-label", bluetoothConnected ? "断开蓝牙" : "连接蓝牙");
      bluetoothStatus.title = bluetoothConnected ? "蓝牙已连接" : "蓝牙未连接";
    }
    const fanThreshold = $("#fan-threshold"); if (fanThreshold && document.activeElement !== fanThreshold) fanThreshold.value = online&&hasNumber(m.fan_threshold) ? m.fan_threshold : 20;
    $$('[data-camera-duration]').forEach(button => button.classList.toggle("active", online&&hasNumber(m.cameraDurationMinutes)&&Number(button.dataset.cameraDuration)===Number(m.cameraDurationMinutes)));
    const hoursInput=$("#camera-hours"),minutesInput=$("#camera-minutes");
    if(online&&hasNumber(m.cameraDurationMinutes)){if(hoursInput&&document.activeElement!==hoursInput)hoursInput.value=String(Math.floor(Number(m.cameraDurationMinutes)/60));if(minutesInput&&document.activeElement!==minutesInput)minutesInput.value=String(Number(m.cameraDurationMinutes)%60)}else{if(hoursInput&&document.activeElement!==hoursInput)hoursInput.value="";if(minutesInput&&document.activeElement!==minutesInput)minutesInput.value=""}
    const timerState = $("#camera-timer-state");
    if (timerState) {
      if (m.camera && m.cameraOffAt > Date.now()) {
        const remaining = Math.max(1, Math.ceil((m.cameraOffAt - Date.now()) / 60000));
        timerState.textContent = `运行中 · ${durationLabel(remaining)}后关闭`;
      } else timerState.textContent = !online ? "设备离线 · 暂无定时配置" : hasNumber(m.cameraDurationMinutes) ? `自动关闭 · ${durationLabel(m.cameraDurationMinutes)}` : "暂无定时配置遥测";
    }
  }

  function setCameraDuration(minutes) {
    const value = clamp(Math.round(minutes), 1, 1439);
    sendCommand("esp32-001", { command:"camera_timer", minutes:value }, `设置拍摄定时 ${durationLabel(value)}`);
  }

  function setDeviceMode(device, mode) {
    const automatic = mode === "auto";
    sendCommand("esp32-001", { command:`${device}_mode`, mode }, `${device === "heater" ? "除露加热" : "机箱风扇"}${automatic ? "自动" : "手动"}模式`);
  }

  function renderDeviceStatuses() {
    $$(".device-row").forEach((row, index) => {
      const id = deviceIds[index]; const badge = $(".online-badge", row);
      const online = isDeviceOnline(id);
      if (!badge) return; badge.textContent = state.simulationEnabled ? "SIMULATED" : online ? "ONLINE" : "OFFLINE"; badge.classList.toggle("offline", !online); badge.classList.toggle("simulated",state.simulationEnabled);
    });
    let onlineCount = 0;
    deviceIds.forEach(id => {
      const online = isDeviceOnline(id);
      if (online) onlineCount += 1;
      const profileStatus = $(`[data-profile-device="${id}"]`);
      profileStatus?.classList.toggle("online", online);
      const profileText = profileStatus?.querySelector("small");
      if (profileText) profileText.textContent = state.simulationEnabled ? "模拟" : online ? "在线" : "离线";
      const drawerStatus = $(`[data-drawer-device="${id}"]`);
      drawerStatus?.classList.toggle("online", online);
      const drawerText = drawerStatus?.querySelector("code");
      if (drawerText) drawerText.textContent = state.simulationEnabled ? "模拟" : online ? "在线" : "离线";
    });
    setText("#profile-device-summary", `${onlineCount} / ${deviceIds.length} 在线`);
  }

  function toggleMain(key) {
    if (key === "flatLed") { toggleFlat("led"); return; }
    const next = !bool(state.main[key]);
    const payload = key === "mosfet" ? { command: "mosfet", state: next ? 1 : 0 } : { command: key, state: next };
    sendCommand("esp32-001", payload, `${labelFor(key)}${next ? "开启" : "关闭"}`);
  }

  function toggleMppt(key) {
    const next = !bool(state.power[key]);
    sendCommand("mppt-001", { [key]: next }, `${labelFor(key)}${next ? "开启" : "关闭"}`);
  }

  function toggleFlat(key) {
    if (key === "led") {
      const next=!bool(state.flat.led); sendCommand("ef-001", { command: "led", state: next, ...(hasNumber(state.flat.brightness)?{brightness:Number(state.flat.brightness)}:{}) }, `平场板灯${next ? "开启" : "关闭"}`);
    } else {
      const next=!bool(state.flat.heater_mode); sendCommand("ef-001", { command: "heater_mode", enabled: next }, `自动加热${next ? "开启" : "关闭"}`);
    }
  }

  function labelFor(key) { return ({ camera:"拍摄系统",heater:"除露加热",fan:"风扇",mosfet:"主电源",mode:"MPPT 算法",enable_fan:"自动散热" })[key] || key; }

  function confirmCommand(title, copy, callback) {
    state.pendingConfirm = callback; setText("#confirm-title", title); setText("#confirm-copy", copy);
    $("#confirm-modal").classList.add("open"); $("#confirm-modal").setAttribute("aria-hidden", "false");
  }
  function closeConfirm() { state.pendingConfirm = null; $("#confirm-modal").classList.remove("open"); $("#confirm-modal").setAttribute("aria-hidden", "true"); }

  function roofCommand(action) {
    if (action === "stop") { sendCommand("esp32-001", { command:"motor_stop" }, "屋顶电机停止"); return; }
    const opening = action === "open";
    confirmCommand(opening ? "确认开启屋顶？" : "确认关闭屋顶？", opening ? "请确认现场无雨、轨道无障碍且赤道仪状态安全。" : "请确认望远镜已停放且屋顶轨道无障碍。", () => {
      closeConfirm(); sendCommand("esp32-001", { command: opening ? "motor_forward" : "motor_reverse" }, opening ? "开启屋顶" : "关闭屋顶");
    });
  }

  function stepperPrecision(step) {
    const value = String(step);
    return value.includes(".") ? value.split(".")[1].length : 0;
  }

  function normalizeStepper(input) {
    const min = number(input.dataset.min, -Infinity), max = number(input.dataset.max, Infinity), step = Math.max(number(input.dataset.step, 1), Number.EPSILON);
    const raw = String(input.value).trim().replace(",", ".");
    if (!hasNumber(raw)) { input.value = ""; return NaN; }
    let value = Number(raw);
    value = clamp(Math.round(value / step) * step, min, max);
    input.value = value.toFixed(stepperPrecision(step));
    return value;
  }

  function adjustStepper(input, direction, multiplier = 1) {
    const step = Math.max(number(input.dataset.step, 1), Number.EPSILON);
    const current = Number.isFinite(Number(input.value)) ? Number(input.value) : number(input.defaultValue);
    input.value = String(current + direction * step * multiplier);
    normalizeStepper(input);
    input.dispatchEvent(new Event("input", { bubbles:true }));
  }

  function bindNumberSteppers() {
    $$('[data-number-stepper]').forEach(stepper => {
      const input = $("input", stepper);
      if (!input) return;
      input.addEventListener("blur", () => normalizeStepper(input));
      input.addEventListener("keydown", event => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault(); adjustStepper(input, event.key === "ArrowUp" ? 1 : -1);
        }
        if (event.key === "Enter") { event.preventDefault(); normalizeStepper(input); input.blur(); }
      });
      $$('[data-step-direction]', stepper).forEach(button => {
        let holdDelay = 0, repeatTimer = 0, repeatCount = 0;
        const direction = Number(button.dataset.stepDirection) || 1;
        const stop = () => {
          clearTimeout(holdDelay); clearInterval(repeatTimer);
          holdDelay = 0; repeatTimer = 0; repeatCount = 0;
          button.classList.remove("pressing");
        };
        button.addEventListener("pointerdown", event => {
          if (event.button !== 0) return;
          event.preventDefault(); stop();
          button.classList.add("pressing");
          button.setPointerCapture?.(event.pointerId);
          input.focus({ preventScroll:true });
          adjustStepper(input, direction);
          holdDelay = window.setTimeout(() => {
            repeatTimer = window.setInterval(() => {
              repeatCount += 1;
              const boost = repeatCount >= 28 ? 10 : repeatCount >= 14 ? 5 : repeatCount >= 6 ? 2 : 1;
              adjustStepper(input, direction, boost);
            }, 90);
          }, 380);
        });
        ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => button.addEventListener(type, stop));
        button.addEventListener("click", event => { if (event.detail === 0) adjustStepper(input, direction); });
        button.addEventListener("contextmenu", event => event.preventDefault());
      });
    });
  }

  function savePowerSettings() {
    $$('[data-number-stepper] input').forEach(normalizeStepper);
    const min = number($("#set-battery-min").value), max = number($("#set-battery-max").value), current = number($("#set-charge-current").value), temp = number($("#set-fan-temp").value);
    if (min < 8 || min > 20 || max < 12 || max > 48 || max - min < .5 || current < .1 || current > 20 || temp < 20 || temp > 80) {
      toast("参数无效", "请检查阈值范围，满电电压需比截止电压高至少 0.5V。", "error"); return;
    }
    sendCommand("mppt-001", { voltage_battery_min:min, voltage_battery_max:max, current_charging:current, temperature_fan:temp }, "保存充电参数");
  }

  function togglePanel() {
    if (state.flat.servoMoving) return;
    const next = !state.flat.servo; confirmCommand(next ? "确认展开平场板？" : "确认收起平场板？", "舵机将驱动平场板移动，请确认机械结构周围无障碍。", () => {
      closeConfirm();
      sendCommand("ef-001", { command:"servo", state:next, angle:next ? state.flat.maxAngle : 0 }, next ? "展开平场板" : "收起平场板");
    });
  }

  function buildTerminals() {
    const devices = [
      ["esp32-001", "主控 · esp32-001"],
      ["mppt-001", "能源 · mppt-001"],
      ["ef-001", "平场板 · ef-001"]
    ];
    $$(".terminal-slot").forEach((slot, index) => {
      const selected = slot.dataset.terminalDefault || "esp32-001";
      const number = slot.dataset.terminalNumber || "04";
      const selectedLabel = devices.find(([value]) => value === selected)?.[1] || devices[0][1];
      const menuId = `terminal-device-menu-${index + 1}`;
      slot.innerHTML = `<article class="card terminal-card" data-terminal-card>
        <header class="card-header"><div><span class="section-icon"><i data-lucide="terminal"></i></span><h3>设备终端</h3></div><button class="mini-link" type="button" data-clear-terminal>清空</button></header>
        <div class="terminal" data-terminal-log aria-live="polite"></div>
        <form data-terminal-form>
          <div class="terminal-device-picker" data-terminal-picker data-value="${selected}">
            <input type="hidden" data-terminal-device value="${selected}" />
            <button class="terminal-device-trigger" type="button" data-terminal-trigger aria-haspopup="listbox" aria-expanded="false" aria-controls="${menuId}">
              <i aria-hidden="true"></i><span data-terminal-device-label>${selectedLabel}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
            </button>
            <div class="terminal-device-menu" id="${menuId}" data-terminal-menu role="listbox" aria-label="选择终端设备" hidden>
              ${devices.map(([value, label]) => `<button type="button" role="option" data-terminal-option="${value}" aria-selected="${value === selected}" class="${value === selected ? "selected" : ""}"><i aria-hidden="true"></i><span>${label}</span><small>${value === "esp32-001" ? "环境 / 屋顶" : value === "mppt-001" ? "光伏 / 电池" : "舵机 / 灯光"}</small></button>`).join("")}
            </div>
          </div>
          <span>›</span><input data-terminal-input placeholder="向所选设备发送指令…" autocomplete="off" /><button type="button" class="terminal-debug-button" data-terminal-debug>打印调试信息</button><button type="submit">发送</button>
        </form>
      </article>`;
    });
  }

  function closeTerminalPicker(picker, restoreFocus = false) {
    if (!picker) return;
    const trigger = $("[data-terminal-trigger]", picker);
    const menu = $("[data-terminal-menu]", picker);
    picker.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
    if (restoreFocus) trigger?.focus();
  }

  function openTerminalPicker(picker, focusSelected = false) {
    $$('[data-terminal-picker].open').forEach(other => { if (other !== picker) closeTerminalPicker(other); });
    const trigger = $("[data-terminal-trigger]", picker);
    const menu = $("[data-terminal-menu]", picker);
    if (!menu) return;
    menu.hidden = false;
    picker.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    if (focusSelected) requestAnimationFrame(() => $("[data-terminal-option].selected", picker)?.focus());
  }

  function setTerminalDevice(picker, value) {
    const option = $(`[data-terminal-option="${value}"]`, picker);
    if (!option) return;
    picker.dataset.value = value;
    const input = $("[data-terminal-device]", picker);
    const label = $("[data-terminal-device-label]", picker);
    if (input) input.value = value;
    if (label) label.textContent = $("span", option)?.textContent || value;
    $$('[data-terminal-option]', picker).forEach(button => {
      const selected = button.dataset.terminalOption === value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    closeTerminalPicker(picker, true);
  }

  function bindTerminalPickers() {
    $$('[data-terminal-picker]').forEach(picker => {
      const trigger = $("[data-terminal-trigger]", picker);
      trigger?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        picker.classList.contains("open") ? closeTerminalPicker(picker) : openTerminalPicker(picker);
      });
      picker.addEventListener("click", event => {
        const option = event.target.closest?.("[data-terminal-option]");
        if (option) { event.stopPropagation(); setTerminalDevice(picker, option.dataset.terminalOption); }
      });
      picker.addEventListener("keydown", event => {
        const options = $$('[data-terminal-option]', picker);
        const current = options.indexOf(document.activeElement);
        if (["Enter", " "].includes(event.key) && document.activeElement === trigger) {
          event.preventDefault(); openTerminalPicker(picker, true); return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!picker.classList.contains("open")) { openTerminalPicker(picker, true); return; }
          const direction = event.key === "ArrowDown" ? 1 : -1;
          options[(current + direction + options.length) % options.length]?.focus();
        }
        if (["Enter", " "].includes(event.key) && current >= 0) {
          event.preventDefault(); setTerminalDevice(picker, options[current].dataset.terminalOption);
        }
        if (event.key === "Escape") { event.preventDefault(); closeTerminalPicker(picker, true); }
      });
    });
    document.addEventListener("pointerdown", event => {
      if (event.composedPath().some(node => node?.hasAttribute?.("data-terminal-picker"))) return;
      $$('[data-terminal-picker].open').forEach(picker => closeTerminalPicker(picker));
    });
  }

  function renderTerminals() {
    const html = state.terminal.map(line => `<p class="${line.level}">[${line.time}] ${escapeHtml(line.source)} · ${escapeHtml(String(line.message))}</p>`).join("");
    $$('[data-terminal-log]').forEach(terminal => {
      terminal.innerHTML = html;
      terminal.scrollTop = terminal.scrollHeight;
    });
  }

  function addLog(source, message, level = "") {
    state.terminal.push({ time: timestamp(), source, message, level });
    if (state.terminal.length > 80) state.terminal.shift();
    renderTerminals();
  }

  function bindAngleDrag(input) {
    if (!input) return;
    let dragging = false;
    let startY = 0;
    let startValue = 0;
    const finish = event => {
      if (!dragging) return;
      dragging = false;
      input.classList.remove("dragging");
      if (input.hasPointerCapture?.(event.pointerId)) input.releasePointerCapture(event.pointerId);
    };
    input.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      dragging = true;
      startY = event.clientY;
      startValue = number(input.value);
      input.classList.add("dragging");
      input.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    const move = event => {
      if (!dragging) return;
      const value = clamp(Math.round(startValue + (startY - event.clientY) * .8), 0, 300);
      input.value = value;
      input.setAttribute("aria-valuetext", `${value} 度`);
      setText("#servo-limit-value", `${value}° · 待确认`);
      $("#angle-limit-control")?.style.setProperty("--limit-progress", `${value / 3}%`);
      event.preventDefault();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    input.addEventListener("lostpointercapture", finish);
  }

  function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
  function toast(title, message, type = "", source = "interaction") {
    if (source !== "background") return;
    const node = document.createElement("div"); node.className = `toast ${type}`; node.innerHTML = `<b>${escapeHtml(title)}</b>${escapeHtml(message)}`;
    $("#toast-stack").append(node); setTimeout(() => { node.classList.add("out"); setTimeout(() => node.remove(), 260); }, 3500);
  }

  function pushHistory(device, payload = {}) {
    const isEnvironment = device === "esp32-001", isPower = device === "mppt-001";
    if (!isEnvironment && !isPower) return;
    const h = state.history;
    const reading = key => Object.prototype.hasOwnProperty.call(payload,key) && hasNumber(payload[key]) ? Number(payload[key]) : NaN;
    h.labels.push(Date.now());
    h.solar.push(isPower ? reading("current_input") : undefined);
    h.charge.push(isPower ? reading("buck_current") : undefined);
    h.battery.push(isPower ? reading("battery_percent") : undefined);
    h.temperature.push(isEnvironment ? reading("dht_temperature") : undefined);
    h.humidity.push(isEnvironment ? reading("dht_humidity") : undefined);
    h.sources.push(Boolean(state.simulationEnabled));
    Object.keys(h).forEach(key => { if (h[key].length > 8641) h[key].shift(); });
    if (isEnvironment) drawEnvironmentLiveChart();
    if (isPower) drawPowerHistoryChart();
  }

  function apiTimestamp(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function rebuildDeviceHistory() {
    const target = state.deviceHistory;
    const now = Date.now();
    const rangeStart = now - target.range * 60000;
    const intervalsByDevice = Object.fromEntries(deviceIds.map(id => [id, []]));
    target.alerts.forEach(alert => {
      if (!intervalsByDevice[alert.device_id] || alert.alert_type !== "offline") return;
      const opened = apiTimestamp(alert.opened_at);
      const resolved = apiTimestamp(alert.resolved_at);
      if (!opened || opened > now || (resolved && resolved < rangeStart)) return;
      intervalsByDevice[alert.device_id].push({ opened, resolved:resolved || 0 });
    });
    Object.values(intervalsByDevice).forEach(intervals => intervals.sort((a,b)=>a.opened-b.opened));
    const devicesById = Object.fromEntries(target.devices.map(device => [device.device_id, device]));
    const evidenceTimes = [rangeStart,now];
    Object.values(intervalsByDevice).flat().forEach(interval=>{if(interval.opened>=rangeStart)evidenceTimes.push(interval.opened);if(interval.resolved>=rangeStart&&interval.resolved<=now)evidenceTimes.push(interval.resolved)});
    deviceIds.forEach(id=>{const lastSeen=apiTimestamp(devicesById[id]?.last_seen);if(lastSeen>=rangeStart&&lastSeen<=now)evidenceTimes.push(lastSeen)});
    const labels=[...new Set(evidenceTimes)].sort((a,b)=>a-b);
    const series = {};
    deviceIds.forEach(id => {
      const intervals=intervalsByDevice[id],device=devicesById[id];
      const currentStatus=String(device?.last_status||"").toLowerCase();
      const lastSeen=apiTimestamp(device?.last_seen);
      series[id]=labels.map(time=>{
        const offlineInterval=intervals.find(interval=>interval.opened<=time&&(!interval.resolved||time<interval.resolved));
        if(offlineInterval)return 0;
        if(time===now&&currentStatus==="offline")return 0;
        const resolvedBefore=intervals.some(interval=>interval.resolved&&interval.resolved<=time);
        if(resolvedBefore)return 1;
        if(currentStatus==="online"&&((lastSeen>=rangeStart&&time>=lastSeen)||time===now))return 1;
        return NaN;
      });
    });
    target.labels = labels;
    target.series = series;
  }

  async function apiRequest(path, options = {}) {
    if (isNativeRuntime()) return nativeRequest(path, options);
    const response = await fetch(path, { credentials:"include", cache:"no-store", ...options, headers:{"Content-Type":"application/json", ...(options.headers || {})} });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(typeof data?.detail === "string" ? data.detail : `请求失败 (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function loadTelemetryHistory() {
    if (!state.auth.user) return;
    buildHistory(); drawPowerHistoryChart(); drawEnvironmentLiveChart();
    try {
      const devices = await apiRequest("/api/v1/devices");
      const accessible = new Set((Array.isArray(devices) ? devices : []).map(device => device.device_id));
      const [environmentRows, powerRows] = await Promise.all([
        accessible.has("esp32-001") ? apiRequest("/api/v1/devices/esp32-001/telemetry?limit=2000") : [],
        accessible.has("mppt-001") ? apiRequest("/api/v1/devices/mppt-001/telemetry?limit=2000") : []
      ]);
      const events = [
        ...(Array.isArray(environmentRows) ? environmentRows : []).map(row => ({ ...row, device:"esp32-001" })),
        ...(Array.isArray(powerRows) ? powerRows : []).map(row => ({ ...row, device:"mppt-001" }))
      ].map(row => ({ ...row, time:apiTimestamp(row.ts) })).filter(row => row.time > 0).sort((a,b) => a.time-b.time).slice(-8641);
      const h = state.history;
      Object.values(h).forEach(values => { values.length = 0; });
      const reading = (payload, key) => Number.isFinite(Number(payload?.[key])) ? Number(payload[key]) : NaN;
      events.forEach(event => {
        const environment = event.device === "esp32-001", power = event.device === "mppt-001", payload = event.payload || {};
        h.labels.push(event.time);
        h.solar.push(power ? reading(payload,"current_input") : undefined);
        h.charge.push(power ? reading(payload,"buck_current") : undefined);
        h.battery.push(power ? reading(payload,"battery_percent") : undefined);
        h.temperature.push(environment ? reading(payload,"dht_temperature") : undefined);
        h.humidity.push(environment ? reading(payload,"dht_humidity") : undefined);
        h.sources.push(false);
      });
      drawPowerHistoryChart();
      drawEnvironmentLiveChart();
    } catch (error) {
      console.warn("Unable to load real telemetry history", error);
      buildHistory(); drawPowerHistoryChart(); drawEnvironmentLiveChart();
    }
  }

  async function loadDeviceHistory() {
    if (!state.auth.user || state.deviceHistory.loading) return;
    const target = state.deviceHistory;
    target.loading = true;
    target.error = "";
    drawDeviceHistoryChart();
    try {
      const [devices, alerts] = await Promise.all([
        apiRequest("/api/v1/devices"),
        apiRequest("/api/v1/alerts?limit=500")
      ]);
      target.devices = Array.isArray(devices) ? devices : [];
      target.alerts = Array.isArray(alerts) ? alerts : [];
      rebuildDeviceHistory();
    } catch (error) {
      target.error = error.status === 401 ? "登录会话已失效，无法读取设备历史" : "设备历史暂时无法读取";
    } finally {
      target.loading = false;
      drawDeviceHistoryChart();
    }
  }

  function drawDeviceHistoryChart() {
    const target = state.deviceHistory;
    const canvas = $("#device-history-chart");
    const empty = $("#device-history-empty");
    if (!canvas || !empty) return;
    const hasEvidence=deviceIds.some(id=>(target.series[id]||[]).filter(Number.isFinite).length>=2);
    if (target.loading && !hasEvidence) {
      empty.hidden = false; canvas.hidden = true; empty.textContent = "正在读取真实设备历史";
      return;
    }
    if (!target.devices.length || target.labels.length < 2 || !hasEvidence) {
      empty.hidden = false; canvas.hidden = true; empty.textContent = target.error || "暂无可用的设备历史记录";
      return;
    }
    empty.hidden = true; canvas.hidden = false;
    canvas.setAttribute("aria-label", "主控、能源和平场板设备在线与离线历史曲线");
    const offsets = { "esp32-001":.04, "mppt-001":0, "ef-001":-.04 };
    drawLineChart(canvas, deviceIds.map(id => ({
      key:`device-${id}`,
      data:(target.series[id] || []).map(value => value + offsets[id]),
      color:deviceMeta[id].color,
      axis:"left"
    })), target.labels, {
      ignoreVisibility:true,
      visibleCount:target.labels.length,
      fromStart:true,
      windowMinutes:target.range,
      axisRanges:{ left:[-.12,1.12] },
      showYAxisLabels:true,
      stepped:true,
      connectGaps:target.connectUnknown,
      showGridLines:false,
      leftAxisColor:"#f5f5f2",
      xLabelColor:"#f5f5f2",
      axisFontSize:8,
      axisFontWeight:600,
      binaryAxisLabels:true,
      yLabelFormatter:(_axis, value) => value > .8 ? "在线" : value < .2 ? "离线" : ""
    });
  }

  function drawPowerHistoryChart() {
    const powerRanges = state.powerYRange === "nominal" ? { left:[0,5], right:[40,100] } : state.powerYRange === "full" ? { left:[0,20], right:[0,100] } : {};
    const energyCanvas = $("#energy-chart");
    energyCanvas?.setAttribute("aria-label", "光伏电流、充电电流与电池电量历史曲线");
    if (energyCanvas) energyCanvas.dataset.yRange = state.powerYRange;
    drawLineChart(energyCanvas, [
      { key:"solar", data:state.history.solar, color:"#7fc8ff", axis:"left" },
      { key:"charge", data:state.history.charge, color:"#f2a14b", axis:"left" },
      { key:"battery", data:state.history.battery, color:"#54d79a", axis:"right" }
    ], state.history.labels, { windowMinutes:state.historyRange, axisRanges:powerRanges, showYAxisLabels:true, leftAxisSuffix:"A", rightAxisSuffix:"%", leftAxisColor:"#f2a14b", rightAxisColor:"#54d79a", xLabelColor:"#f5f5f2", axisFontSize:8, axisFontWeight:400 });
  }

  function drawCharts() {
    drawPowerHistoryChart();
    drawEnvironmentLiveChart();
    drawDeviceHistoryChart();
    requestAnimationFrame(() => requestAnimationFrame(drawForecastCharts));
  }

  function dewPointC(temperature, humidity) {
    if (!hasNumber(temperature) || !hasNumber(humidity) || Number(humidity) <= 0) return NaN;
    const a = 17.62, b = 243.12;
    const gamma = Math.log(Number(humidity) / 100) + a * Number(temperature) / (b + Number(temperature));
    return b * gamma / (a - gamma);
  }

  function drawEnvironmentLiveChart() {
    const now = Date.now(), historyStart = now - state.environmentLiveRange * 60000, forecastEnd = now + state.forecastRange * 3600000;
    const historyIndices = state.history.labels.map((time,index)=>({time:chartPointTime(time),index})).filter(point => point.time >= historyStart && point.time <= now && (hasNumber(state.history.temperature[point.index]) || hasNumber(state.history.humidity[point.index])));
    const forecast = state.forecast.hourly;
    const forecastIndices = (forecast.time || []).map((time,index)=>({time:chartPointTime(time),index})).filter(point => point.time >= now - 3600000 && point.time <= forecastEnd && (hasNumber(forecast.temperature[point.index]) || hasNumber(forecast.humidity[point.index])));
    const labels = [...historyIndices.map(point=>point.time), ...forecastIndices.map(point=>point.time)];
    const historyPadding = Array(forecastIndices.length).fill(NaN), forecastPadding = Array(historyIndices.length).fill(NaN);
    const measuredTemperature = [...historyIndices.map(point=>number(state.history.temperature[point.index],NaN)), ...historyPadding];
    const measuredHumidity = [...historyIndices.map(point=>number(state.history.humidity[point.index],NaN)), ...historyPadding];
    const measuredDewPoint = [...historyIndices.map(point=>dewPointC(state.history.temperature[point.index],state.history.humidity[point.index])), ...historyPadding];
    const forecastTemperature = [...forecastPadding, ...forecastIndices.map(point=>number(forecast.temperature[point.index],NaN))];
    const forecastHumidity = [...forecastPadding, ...forecastIndices.map(point=>number(forecast.humidity[point.index],NaN))];
    const ranges = state.environmentYRange === "comfort" ? { left:[10,30], right:[30,80] } : state.environmentYRange === "full" ? { left:[-20,50], right:[0,100] } : {};
    const canvas = $("#environment-live-chart"), empty = $("#environment-live-empty");
    const hasMeasured = measuredTemperature.some(Number.isFinite) || measuredHumidity.some(Number.isFinite);
    const hasForecast = forecastTemperature.some(Number.isFinite) || forecastHumidity.some(Number.isFinite);
    if (empty) {
      empty.hidden = hasMeasured || hasForecast;
      empty.textContent = state.forecast.loading ? "正在读取真实温湿度与预报数据" : "暂无真实温湿度数据";
    }
    const xUnit = state.environmentLiveRange <= 60 ? "分钟" : state.environmentLiveRange <= 1440 ? "小时" : state.environmentLiveRange <= 10080 ? "星期" : "日期";
    canvas?.setAttribute("aria-label", `实测温湿度、露点与未来预报合并曲线，历史横轴按${xUnit}显示，预报线使用虚线`);
    if (canvas) canvas.dataset.xAxisUnit = xUnit;
    const dewColor = state.themeColor === "black" ? "#e57654" : getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#e57654";
    drawLineChart(canvas, [
      { key:"temperature", label:"实测温度", data:measuredTemperature, color:"#ff9f43", axis:"left" },
      { key:"humidity", label:"实测湿度", data:measuredHumidity, color:"#66c7f2", axis:"right" },
      { key:"dewPoint", label:"实测露点", data:measuredDewPoint, color:dewColor, axis:"left", lineWidth:2.2 },
      { key:"forecastTemp", label:"预报温度", data:forecastTemperature, color:"#ff9f43", axis:"left", dash:[7,5] },
      { key:"forecastHumidity", label:"预报湿度", data:forecastHumidity, color:"#66c7f2", axis:"right", dash:[7,5] }
    ], labels, {
      visibleCount:labels.length,
      fromStart:true,
      timeScale:true,
      ignoreVisibility:true,
      showNowMarker:hasMeasured && hasForecast,
      mirrorNowMarker:false,
      axisRanges:ranges,
      showYAxisLabels:true,
      leftAxisSuffix:"°",
      rightAxisSuffix:"%",
      xLabelColor:"#ffffff",
      leftAxisColor:"#ff9f43",
      rightAxisColor:"#66c7f2",
      axisFontSize:11,
      axisFontWeight:400,
      axisFontFamily:'Inter, "SF Pro Display", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    });
  }

  // Keep measured telemetry and forecast data in separate charts so each curve has its own time domain.
  function drawEnvironmentLiveChart() {
    const now=Date.now(),historyStart=now-state.environmentLiveRange*60000,forecastEnd=now+state.environmentForecastRange*60000;
    const historyPoints=state.history.labels.map((time,index)=>({time:chartPointTime(time),index})).filter(point=>point.time>=historyStart&&point.time<=now&&(state.simulationEnabled||state.history.sources[point.index]!==true)&&(hasNumber(state.history.temperature[point.index])||hasNumber(state.history.humidity[point.index])));
    const forecast=state.forecast.hourly,forecastPoints=(forecast.time||[]).map((time,index)=>({time:chartPointTime(time),index})).filter(point=>point.time>=now-3600000&&point.time<=forecastEnd&&(hasNumber(forecast.temperature[point.index])||hasNumber(forecast.humidity[point.index])));
    const historyLabels=historyPoints.map(point=>point.time),forecastLabels=forecastPoints.map(point=>point.time),measuredTemperature=historyPoints.map(point=>number(state.history.temperature[point.index],NaN)),measuredHumidity=historyPoints.map(point=>number(state.history.humidity[point.index],NaN)),measuredDewPoint=historyPoints.map(point=>dewPointC(state.history.temperature[point.index],state.history.humidity[point.index])),forecastTemperature=forecastPoints.map(point=>number(forecast.temperature[point.index],NaN)),forecastHumidity=forecastPoints.map(point=>number(forecast.humidity[point.index],NaN)),forecastDewPoint=forecastPoints.map(point=>dewPointC(forecast.temperature[point.index],forecast.humidity[point.index]));
    const canvas=$("#environment-live-chart"),empty=$("#environment-live-empty"),card=canvas?.closest(".temperature-card");if(!canvas||!card)return;
    let measuredLegend=card.querySelector(".environment-live-measured-legend");if(!measuredLegend){const legacy=card.querySelector(".environment-live-legend");measuredLegend=legacy||document.createElement("div");measuredLegend.className="environment-live-legend environment-live-measured-legend";measuredLegend.innerHTML="<span><i></i>实测温度 °C</span><span><i></i>实测湿度 %</span><span class=\"dewpoint-legend\"><i></i>实测露点 °C</span>";if(!legacy)canvas.parentElement.before(measuredLegend)}
    let section=$("#environment-live-forecast");if(!section){section=document.createElement("section");section.id="environment-live-forecast";section.className="environment-live-forecast";section.innerHTML="<div class=\"environment-live-legend environment-live-forecast-legend\"><span class=\"forecast-temperature-legend\"><i></i>预报温度</span><span class=\"forecast-humidity-legend\"><i></i>预报湿度</span><span class=\"forecast-dewpoint-legend\"><i></i>预报露点</span></div><div class=\"environment-live-chart\"><div class=\"environment-live-empty\" id=\"environment-forecast-empty\">暂无预报温湿度数据</div><canvas id=\"environment-forecast-chart\"></canvas></div>";canvas.parentElement.after(section)}
    const forecastCanvas=$("#environment-forecast-chart"),forecastEmpty=$("#environment-forecast-empty"),hasMeasured=measuredTemperature.some(Number.isFinite)||measuredHumidity.some(Number.isFinite)||measuredDewPoint.some(Number.isFinite),hasForecast=forecastTemperature.some(Number.isFinite)||forecastHumidity.some(Number.isFinite)||forecastDewPoint.some(Number.isFinite);if(empty){empty.hidden=state.simulationEnabled||hasMeasured;empty.textContent=state.forecast.loading?"正在读取真实温湿度数据":"暂无真实温湿度数据"}if(forecastEmpty){forecastEmpty.hidden=hasForecast;forecastEmpty.textContent=state.forecast.loading?"正在读取预报数据":"暂无预报温湿度数据"}
    const ranges=state.environmentYRange==="comfort"?{left:[10,30],right:[30,80]}:state.environmentYRange==="full"?{left:[-20,50],right:[0,100]}:{},forecastRanges=state.environmentForecastYRange==="comfort"?{left:[10,30],right:[30,80]}:state.environmentForecastYRange==="full"?{left:[-20,50],right:[0,100]}:{},dewColor=state.themeColor==="black"?"#e57654":getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()||"#e57654";
    if(hasMeasured)drawLineChart(canvas,[{key:"temperature",label:"实测温度",data:measuredTemperature,color:"#ff9f43",axis:"left"},{key:"humidity",label:"实测湿度",data:measuredHumidity,color:"#66c7f2",axis:"right"},{key:"dewPoint",label:"实测露点",data:measuredDewPoint,color:dewColor,axis:"left",lineWidth:2.2}],historyLabels,{visibleCount:historyLabels.length,fromStart:true,timeScale:true,windowMinutes:state.environmentLiveRange,ignoreVisibility:true,showNowMarker:false,axisRanges:ranges,showYAxisLabels:true,leftAxisSuffix:"°",rightAxisSuffix:"%",xLabelColor:"#ffffff",leftAxisColor:"#ff9f43",rightAxisColor:"#66c7f2",axisFontSize:11,axisFontWeight:400});
    if(forecastCanvas&&hasForecast)drawLineChart(forecastCanvas,[{key:"forecastTemp",label:"预报温度",data:forecastTemperature,color:"#ff9f43",axis:"left",dash:[7,5]},{key:"forecastHumidity",label:"预报湿度",data:forecastHumidity,color:"#66c7f2",axis:"right",dash:[7,5]},{key:"forecastDewPoint",label:"预报露点",data:forecastDewPoint,color:dewColor,axis:"left",dash:[7,5],lineWidth:2.2}],forecastLabels,{visibleCount:forecastLabels.length,fromStart:true,timeScale:true,windowMinutes:state.environmentForecastRange,ignoreVisibility:true,showNowMarker:false,mirrorNowMarker:false,axisRanges:forecastRanges,showYAxisLabels:true,leftAxisSuffix:"°",rightAxisSuffix:"%",xLabelColor:"#ffffff",leftAxisColor:"#ff9f43",rightAxisColor:"#66c7f2",axisFontSize:11,axisFontWeight:400});
    syncEnvironmentForecastControls();
  }

  function syncEnvironmentForecastControls(){
    const section=$("#environment-live-forecast");if(!section)return;
    let toolbar=section.querySelector(".environment-live-forecast-toolbar");
    if(!toolbar){toolbar=document.createElement("div");toolbar.className="environment-live-toolbar environment-live-forecast-toolbar";toolbar.innerHTML="<div><span>\u6a2a\u8f74\u65f6\u95f4</span><button data-env-forecast-range=\"60\">1h</button><button data-env-forecast-range=\"360\">6h</button><button data-env-forecast-range=\"720\">12h</button><button data-env-forecast-range=\"1440\">24h</button><button data-env-forecast-range=\"10080\">1\u5468</button><button data-env-forecast-range=\"43200\">1\u6708</button></div><div><span>\u7eb5\u8f74\u8303\u56f4</span><button data-env-forecast-y-range=\"auto\">\u81ea\u52a8</button><button data-env-forecast-y-range=\"comfort\">\u8212\u9002</button><button data-env-forecast-y-range=\"full\">\u5168\u91cf</button></div>";section.prepend(toolbar);toolbar.querySelectorAll('[data-env-forecast-range]').forEach(button=>button.addEventListener("click",()=>{state.environmentForecastRange=Number(button.dataset.envForecastRange);drawEnvironmentLiveChart()}));toolbar.querySelectorAll('[data-env-forecast-y-range]').forEach(button=>button.addEventListener("click",()=>{state.environmentForecastYRange=button.dataset.envForecastYRange;drawEnvironmentLiveChart()}))}
    const forecastTimes=state.forecast.hourly?.time||[],lastForecastTime=forecastTimes.length?chartPointTime(forecastTimes[forecastTimes.length-1]):0,maxForecastMinutes=lastForecastTime?Math.max(60,Math.round((lastForecastTime-Date.now())/60000)):Infinity;$$('[data-env-forecast-range]').forEach(button=>{const minutes=Number(button.dataset.envForecastRange);button.hidden=minutes>maxForecastMinutes+24*60});
    const visibleForecastRanges=$$('[data-env-forecast-range]').filter(button=>!button.hidden).map(button=>Number(button.dataset.envForecastRange));if(visibleForecastRanges.length&&state.environmentForecastRange>Math.max(...visibleForecastRanges))state.environmentForecastRange=Math.max(...visibleForecastRanges);
    $$('[data-env-live-range]').forEach(button=>button.classList.toggle("active",Number(button.dataset.envLiveRange)===state.environmentLiveRange));$$('[data-env-y-range]').forEach(button=>button.classList.toggle("active",button.dataset.envYRange===state.environmentYRange));$$('[data-env-forecast-range]').forEach(button=>button.classList.toggle("active",Number(button.dataset.envForecastRange)===state.environmentForecastRange));$$('[data-env-forecast-y-range]').forEach(button=>button.classList.toggle("active",button.dataset.envForecastYRange===state.environmentForecastYRange));
    if(state.simulationEnabled)$("#environment-live-empty")?.setAttribute("hidden","");
  }

  const sevenTimerSeeingArcsec = [0.4, 0.625, 0.875, 1.125, 1.375, 1.75, 2.25, 3];
  const sevenTimerScore = value => hasNumber(value) ? clamp(100 - (Number(value) - 1) * (100 / 7), 0, 100) : NaN;

  function parseSevenTimer(data) {
    const init = String(data?.init || "");
    const match = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(init);
    if (!match) throw new Error("7Timer init time is missing or invalid");
    const base = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]));
    const baseDate=new Date(base);
    if (!Number.isFinite(base)||baseDate.getUTCFullYear()!==Number(match[1])||baseDate.getUTCMonth()!==Number(match[2])-1||baseDate.getUTCDate()!==Number(match[3])||baseDate.getUTCHours()!==Number(match[4])) throw new Error("7Timer init time is invalid");
    const labels = [], seeing = [], clear = [], transparency = [], cloud = [];
    (data?.dataseries || []).forEach(point => {
      const timepoint=Number(point?.timepoint),cloudIndex=Number(point?.cloudcover),seeingIndex=Number(point?.seeing),transparencyIndex=Number(point?.transparency);
      if(!Number.isFinite(timepoint)||timepoint<0||!Number.isInteger(cloudIndex)||cloudIndex<1||cloudIndex>9||!Number.isInteger(seeingIndex)||seeingIndex<1||seeingIndex>8||!Number.isInteger(transparencyIndex)||transparencyIndex<1||transparencyIndex>8)return;
      const transparencyScore = sevenTimerScore(transparencyIndex);
      const cloudScore = sevenTimerScore(cloudIndex);
      labels.push(base + timepoint * 3600000);
      seeing.push(sevenTimerSeeingArcsec[seeingIndex - 1]);
      transparency.push(transparencyScore);
      cloud.push(cloudIndex);
      clear.push(Math.round(transparencyScore * .55 + cloudScore * .45));
    });
    if(!labels.length)throw new Error("7Timer returned no valid forecast points");
    return { labels, seeing, clear, transparency, cloud, init, updatedAt:Date.now() };
  }

  async function loadSevenTimer(location = state.forecast.location) {
    const target = state.sevenTimer;
    if(!location||!hasNumber(location.latitude)||!hasNumber(location.longitude)){
      Object.assign(target,{labels:[],seeing:[],clear:[],transparency:[],cloud:[],loading:false,error:"请选择预报地点",init:"",updatedAt:0});
      renderForecast(); return;
    }
    target.loading = true; target.error = "";
    renderForecast();
    const params = new URLSearchParams({ lat:Number(location.latitude).toFixed(4), lon:Number(location.longitude).toFixed(4) });
    try {
      const parsed = parseSevenTimer(await apiRequest(`/api/astro?${params}`));
      Object.assign(target, parsed, { loading:false, error:"" });
    } catch (error) {
      Object.assign(target,{labels:[],seeing:[],clear:[],transparency:[],cloud:[],loading:false,error:"7Timer 预报暂不可用",init:"",updatedAt:0});
    }
    renderForecast();
  }

  function closeSeeingSourceMenu() {
    const picker = $("#seeing-source-picker"), trigger = $("#seeing-source-trigger"), menu = $("#seeing-source-menu");
    if (menu) menu.hidden = true;
    picker?.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  }

  function setSeeingSource(source) {
    if (!seeingSourceMeta[source]) return;
    state.seeingSource = source;
    localStorage.setItem("astra.seeingSource", source);
    closeSeeingSourceMenu();
    if (source === "seventimer" && !state.sevenTimer.labels.length && !state.sevenTimer.loading) loadSevenTimer();
    renderForecast();
  }

  function renderSeeingSource() {
    const openData = state.forecast.hourly, sevenData = state.sevenTimer;
    const hasLocation=!!state.forecast.location;
    const hasOpenData = !!openData?.time?.length&&openData.seeing.some(Number.isFinite), hasSevenData = !!sevenData?.labels?.length&&sevenData.seeing.some(Number.isFinite);
    const openCanvas = $("#forecast-astro-chart"), openEmpty = $("#forecast-astro-empty");
    const sevenCanvas = $("#forecast-seven-chart"), sevenEmpty = $("#forecast-seven-empty");
    const sevenStatus = $("#seven-timer-status");
    if (openEmpty) { openEmpty.hidden = hasOpenData; openEmpty.textContent = state.forecast.loading ? "正在获取 Open-Meteo 在线天气数据…" : hasLocation ? "Open-Meteo 数据暂不可用" : "请选择预报地点"; }
    if (openCanvas) openCanvas.hidden = !hasOpenData;
    if (sevenEmpty) {
      sevenEmpty.hidden = hasSevenData;
      sevenEmpty.textContent = sevenData.loading ? "正在获取 7Timer 天文预报…" : sevenData.error || (hasLocation ? "7Timer 数据暂不可用" : "请选择预报地点");
    }
    if (sevenCanvas) sevenCanvas.hidden = !hasSevenData;
    if (sevenStatus) {
      const status = hasSevenData ? "connected" : sevenData.loading ? "loading" : sevenData.error&&hasLocation ? "error" : "idle";
      sevenStatus.classList.toggle("connected", status === "connected");
      sevenStatus.classList.toggle("error", status === "error");
      sevenStatus.classList.toggle("loading", status === "loading");
      const statusLabel = status === "connected" ? "7Timer 在线" : status === "error" ? "7Timer 连接失败" : status === "loading" ? "正在连接 7Timer" : "7Timer 暂无数据";
      sevenStatus.setAttribute("aria-label", statusLabel);
      sevenStatus.title = statusLabel;
    }
    $$('[data-seven-timer-range]').forEach(button => button.classList.toggle("active", Number(button.dataset.sevenTimerRange) === state.sevenTimerRange));
    setText("#forecast-clear-title", "晴朗程度");
    setText("#forecast-seeing-title", "视宁度参考");
    setText("#forecast-seeing-unit", "/ 100");
    if (!hasOpenData) {
      setText("#forecast-seeing", "--");
      $("#forecast-seeing")?.removeAttribute("title");
    } else {
      let index = openData.time.findIndex(value => new Date(value).getTime() >= Date.now());
      if (index < 0) index = 0;
      setText("#forecast-seeing", hasNumber(openData.seeing[index]) ? Math.round(openData.seeing[index]) : "--");
      $("#forecast-seeing")?.setAttribute("title", "基于风速、湿度、云量与能见度的参考评分，不是仪器实测");
    }
  }

  function forecastAutoRange(values, minLimit = -Infinity, maxLimit = Infinity, minimumSpan = 1) {
    const finite = values.map(Number).filter(Number.isFinite);
    if (!finite.length) return [Number.isFinite(minLimit) ? minLimit : 0, Number.isFinite(maxLimit) ? maxLimit : minimumSpan];
    const dataMin = Math.min(...finite), dataMax = Math.max(...finite);
    const margin = dataMax === dataMin ? minimumSpan : (dataMax - dataMin) * .12;
    const min = Math.max(minLimit, dataMin - margin), max = Math.min(maxLimit, dataMax + margin);
    return max > min ? [min, max] : [Math.max(minLimit, min - minimumSpan), Math.min(maxLimit, max + minimumSpan)];
  }

  function drawAstronomyChart() {
    renderSeeingSource();
    const openData = state.forecast.hourly, sevenData = state.sevenTimer;
    let sharedNowMarkerFraction = NaN;
    if (openData?.seeing?.length) {
      const count = Math.min(state.forecastRange, openData.time.length);
      const firstTime = chartPointTime(openData.time[0]), lastTime = chartPointTime(openData.time[count - 1]), now = Date.now();
      if (Number.isFinite(firstTime) && Number.isFinite(lastTime) && now >= firstTime && now <= lastTime) sharedNowMarkerFraction = clamp((now - firstTime) / Math.max(lastTime - firstTime, 1), 0, 1);
      const fullRange = state.forecastYRange === "full", comfortRange = state.forecastYRange === "comfort";
      const axisRanges = fullRange ? { left:[0,100], right:[0,100] } : comfortRange ? { left:[50,100], right:[50,100] } : {
        left:forecastAutoRange(openData.seeing.slice(0, count), 0, 100, 10),
        right:forecastAutoRange(openData.clear.slice(0, count), 0, 100, 10)
      };
      drawLineChart($("#forecast-astro-chart"), [
        { key:"forecastSeeing", data:openData.seeing, color:seeingSourceMeta.openmeteo.color, axis:"left" },
        { key:"forecastClear", data:openData.clear, color:"#f3d369", axis:"right" }
      ], openData.time, { visibleCount:count, fromStart:true, ignoreVisibility:true, showNowMarker:true, mirrorNowMarker:false, axisRanges, showYAxisLabels:true, leftAxisSuffix:"分", rightAxisSuffix:"%", axisFontWeight:600 });
    }
    if (sevenData?.seeing?.length) {
      const sevenCount = Math.min(Math.ceil(state.sevenTimerRange / 3), sevenData.labels.length);
      const visibleSeeing = sevenData.seeing.slice(0, sevenCount), visibleTransparency = sevenData.transparency.slice(0, sevenCount);
      const fullRange = state.forecastYRange === "full", comfortRange = state.forecastYRange === "comfort";
      const axisMax = Math.max(5, Math.ceil(Math.max(0, ...visibleSeeing)));
      const axisRanges = fullRange ? { left:[0,axisMax], right:[0,100] } : comfortRange ? { left:[0,3], right:[50,100] } : {
        left:forecastAutoRange(visibleSeeing, 0, Infinity, 1),
        right:forecastAutoRange(visibleTransparency, 0, 100, 10)
      };
      drawLineChart($("#forecast-seven-chart"), [
        { key:"sevenTimerSeeing", data:sevenData.seeing, color:seeingSourceMeta.seventimer.color, axis:"left" },
        { key:"sevenTimerTransparency", data:sevenData.transparency, color:"#f3d369", axis:"right" }
      ], sevenData.labels, { visibleCount:sevenCount, fromStart:true, ignoreVisibility:true, showNowMarker:true, nowMarkerFraction:sharedNowMarkerFraction, mirrorNowMarker:false, axisRanges, showYAxisLabels:true, leftAxisSuffix:"″", rightAxisSuffix:"%", axisFontWeight:600 });
    }
  }

  function drawForecastCharts() {
    const f = state.forecast.hourly;
    if (f.time.length) {
      const count = Math.min(state.forecastRange, f.time.length);
      const common = { visibleCount:count, fromStart:true, ignoreVisibility:true, showNowMarker:true, mirrorNowMarker:false };
      const rainValues = f.precipitation.slice(0, count).map(Number).filter(Number.isFinite);
      const rainMax = Math.max(0, ...rainValues);
      const rainAxisMax = Math.max(0.4, Math.ceil(rainMax * 12) / 10);
      const fullRange = state.forecastYRange === "full", comfortRange = state.forecastYRange === "comfort";
      const visibleTemperature = f.temperature.slice(0, count), visibleHumidity = f.humidity.slice(0, count), visibleCloud = f.cloud.slice(0, count);
      const temperatureMin = Math.min(0, ...visibleTemperature.filter(Number.isFinite)), temperatureMax = Math.max(0, ...visibleTemperature.filter(Number.isFinite));
      const temperatureRanges = fullRange ? {
        left:[Math.min(-40, Math.floor(temperatureMin / 10) * 10), Math.max(50, Math.ceil(temperatureMax / 10) * 10)], right:[0,100]
      } : comfortRange ? {
        left:[10,30], right:[30,80]
      } : {
        left:forecastAutoRange(visibleTemperature, -Infinity, Infinity, 4), right:forecastAutoRange(visibleHumidity, 0, 100, 10)
      };
      const skyRanges = fullRange ? { left:[0,100], right:[0,Math.max(10, Math.ceil(rainMax / 5) * 5)] } : comfortRange ? { left:[0,60], right:[0,2] } : {
        left:forecastAutoRange(visibleCloud, 0, 100, 10), right:[0,rainAxisMax]
      };
      drawLineChart($("#forecast-temperature-chart"), [
        { key:"forecastTemp", data:f.temperature, color:"#ff9f43", axis:"left" },
        { key:"forecastHumidity", data:f.humidity, color:"#66c7f2", axis:"right" }
      ], f.time, { ...common, axisRanges:temperatureRanges, showYAxisLabels:true, leftAxisSuffix:"°", rightAxisSuffix:"%", axisFontWeight:600 });
      drawLineChart($("#forecast-sky-chart"), [
        { key:"forecastCloud", data:f.cloud, color:"#a6a8b1", axis:"left" },
        { key:"forecastRain", data:f.precipitation, color:"#4ab8e8", axis:"right" }
      ], f.time, { ...common, axisRanges:skyRanges, showYAxisLabels:true, leftAxisSuffix:"%", rightAxisSuffix:"mm", axisFontWeight:600 });
    } else {
      drawLineChart($("#forecast-sky-chart"),[],[],{ignoreVisibility:true,showYAxisLabels:true,leftAxisSuffix:"%",rightAxisSuffix:"mm",axisFontWeight:600});
    }
    drawAstronomyChart();
  }

  function chartPointTime(value) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function formatChartTimeLabel(value, rangeMinutes = 0) {
    const date = new Date(chartPointTime(value));
    if (!Number.isFinite(date.getTime())) return "—";
    if (rangeMinutes === 10080) return `${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")}`;
    if (rangeMinutes >= 43200) return `${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")}`;
    if (rangeMinutes > 0 && rangeMinutes <= 1440) return `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
    return `${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
  }

  const chartSeriesMeta = {
    solar:{ label:"光伏电流", unit:" A", digits:2 },
    charge:{ label:"充电电流", unit:" A", digits:2 },
    battery:{ label:"电池电量", unit:"%", digits:1 },
    temperature:{ label:"温度", unit:"°C", digits:1 },
    humidity:{ label:"湿度", unit:"%", digits:1 },
    forecastTemp:{ label:"温度", unit:"°C", digits:1 },
    forecastHumidity:{ label:"湿度", unit:"%", digits:0 },
    forecastCloud:{ label:"云量", unit:"%", digits:0 },
    forecastRain:{ label:"降水", unit:" mm", digits:1 },
    forecastSeeing:{ label:"视宁度参考", unit:" 分", digits:0 },
    forecastClear:{ label:"晴朗程度", unit:"%", digits:0 },
    sevenTimerSeeing:{ label:"视宁度", unit:"″", digits:2 },
    sevenTimerTransparency:{ label:"大气透明度", unit:"%", digits:0 }
  };

  function chartHoverTime(value) {
    const date = new Date(chartPointTime(value));
    if (!Number.isFinite(date.getTime())) return "时间未知";
    const sameYear = date.getFullYear() === new Date().getFullYear();
    const datePart = `${sameYear ? "" : `${date.getFullYear()}-`}${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    return `${datePart} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}:${String(date.getSeconds()).padStart(2,"0")}`;
  }

  function chartSeriesDisplay(item, value, index) {
    if (typeof item.tooltipFormatter === "function") return item.tooltipFormatter(value, index);
    const deviceId = String(item.key || "").replace(/^device-/, "");
    if (deviceMeta[deviceId]) return value >= .5 ? "在线" : "离线";
    const meta = chartSeriesMeta[item.key] || {};
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    return `${numeric.toFixed(meta.digits ?? (Math.abs(numeric) < 10 ? 2 : 1))}${meta.unit || ""}`;
  }

  function chartSeriesLabel(item) {
    const deviceId = String(item.key || "").replace(/^device-/, "");
    return item.label || deviceMeta[deviceId]?.label || chartSeriesMeta[item.key]?.label || item.key || "数据";
  }

  function chartSeriesPoints(item, meta) {
    const points = [];
    for (let index=meta.start; index<meta.end; index++) {
      const value = Number(item.data[index]), time = chartPointTime(meta.labels[index]);
      if (Number.isFinite(value) && Number.isFinite(time)) points.push({ value, time, index });
    }
    return points;
  }

  function chartSeriesSample(item, meta, targetTime) {
    if (meta.options.stepped) {
      let selected=null;
      for(let index=meta.start;index<meta.end;index++){
        const raw=item.data[index],time=chartPointTime(meta.labels[index]);
        if(!Number.isFinite(time)||time>targetTime)break;
        if(raw===undefined)continue;
        const value=Number(raw);
        selected=Number.isFinite(value)?{value,time,index}:null;
      }
      return selected;
    }
    const segments=[];let segment=[];
    for(let index=meta.start;index<meta.end;index++){
      const raw=item.data[index];
      if(raw===undefined)continue;
      const value=Number(raw),time=chartPointTime(meta.labels[index]);
      if(Number.isFinite(value)&&Number.isFinite(time))segment.push({value,time,index});
      else if(segment.length){segments.push(segment);segment=[]}
    }
    if(segment.length)segments.push(segment);
    const points=segments.find(points=>targetTime>=points[0].time&&targetTime<=points.at(-1).time);
    if(!points?.length)return null;
    if(points.length===1)return Math.abs(points[0].time-targetTime)<1000?{...points[0]}:null;
    for(let index=1;index<points.length;index++){
      const right=points[index],left=points[index-1];
      if(right.time<targetTime)continue;
      const progress=clamp((targetTime-left.time)/Math.max(right.time-left.time,1),0,1);
      return{value:left.value+(right.value-left.value)*progress,time:targetTime,index:left.index};
    }
    return null;
  }

  function chartMarkerX(canvas, meta, point) {
    let fraction;
    if (meta.options.windowMinutes || meta.options.timeScale) fraction = (point.time-meta.windowStart)/Math.max(meta.windowEnd-meta.windowStart,1);
    else fraction = (point.index-meta.start)/Math.max(meta.shownLabels.length-1,1);
    return canvas.offsetLeft+meta.pad.left+clamp(fraction,0,1)*meta.plotW;
  }

  function placeChartMarkers(canvas, samples) {
    const meta = canvas._astraHoverMeta, ui = canvas._astraHoverUi;
    if (!meta || !ui) return;
    canvas._astraMarkerNodes ||= new Map();
    const visibleKeys = new Set();
    samples.forEach(sample => {
      if (!sample) return;
      const { item, value, x } = sample, bounds = meta.axisBounds[item.axis];
      if (!bounds || !Number.isFinite(value)) return;
      let marker = canvas._astraMarkerNodes.get(item.key);
      if (!marker) {
        marker = document.createElement("i");
        marker.dataset.seriesMarker = item.key;
        ui.markers.append(marker);
        canvas._astraMarkerNodes.set(item.key, marker);
      }
      const y = canvas.offsetTop+meta.pad.top+(1-(value-bounds[0])/Math.max(bounds[1]-bounds[0],1e-9))*meta.plotH;
      marker.style.setProperty("--series-color", item.color);
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;
      marker.hidden = false;
      visibleKeys.add(item.key);
    });
    canvas._astraMarkerNodes.forEach((marker,key) => { marker.hidden = !visibleKeys.has(key); });
    ui.markers.classList.toggle("visible", visibleKeys.size>0);
  }

  function restoreChartMarkers(canvas) {
    const meta = canvas._astraHoverMeta;
    if (!meta) return;
    const samples = meta.active.map(item => {
      const point = chartSeriesPoints(item,meta).at(-1);
      return point ? { item, ...point, x:chartMarkerX(canvas,meta,point) } : null;
    });
    placeChartMarkers(canvas,samples);
  }

  function bindChartHover(canvas) {
    if (canvas._astraHoverBound) return;
    canvas._astraHoverBound = true;
    const host = canvas.parentElement;
    if (!host) return;
    host.classList.add("chart-hover-host");
    const guide = document.createElement("i");
    guide.className = "chart-hover-guide";
    const markers = document.createElement("div");
    markers.className = "chart-hover-markers";
    const tooltip = document.createElement("div");
    tooltip.className = "chart-hover-tooltip";
    tooltip.setAttribute("role", "status");
    host.append(guide, markers, tooltip);
    canvas._astraHoverUi = { host, guide, markers, tooltip };

    const leave = () => {
      guide.classList.remove("visible");
      tooltip.classList.remove("visible");
      restoreChartMarkers(canvas);
    };
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointercancel", leave);
    canvas.addEventListener("pointermove", event => {
      const meta = canvas._astraHoverMeta;
      if (!meta?.shownLabels?.length || !meta.active.length) return leave();
      const rect = canvas.getBoundingClientRect();
      const localX = event.clientX-rect.left, localY = event.clientY-rect.top;
      if (localX<meta.pad.left || localX>rect.width-meta.pad.right || localY<meta.pad.top || localY>rect.height-meta.pad.bottom) return leave();
      const fraction = clamp((localX-meta.pad.left)/Math.max(meta.plotW,1),0,1);
      const firstTime = chartPointTime(meta.shownLabels[0]), lastTime = chartPointTime(meta.shownLabels.at(-1));
      if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime)) return leave();
      const targetTime = meta.options.windowMinutes || meta.options.timeScale
        ? meta.windowStart+(meta.windowEnd-meta.windowStart)*fraction
        : firstTime+(lastTime-firstTime)*fraction;
      const x = canvas.offsetLeft+meta.pad.left+fraction*meta.plotW;
      const samples = meta.active.map(item => {
        const sample = chartSeriesSample(item,meta,targetTime);
        return sample ? { item, ...sample, x } : null;
      });
      const rows = samples.map(sample => sample
        ? `<div><i style="--series-color:${escapeHtml(sample.item.color)}"></i><span>${escapeHtml(chartSeriesLabel(sample.item))}</span><b>${escapeHtml(chartSeriesDisplay(sample.item,sample.value,sample.index))}</b></div>`
        : "").join("");
      tooltip.innerHTML = `<time>${escapeHtml(chartHoverTime(targetTime))}</time>${rows}`;
      placeChartMarkers(canvas,samples);
      guide.style.left = `${x}px`;
      guide.style.top = `${canvas.offsetTop+meta.pad.top}px`;
      guide.style.height = `${meta.plotH}px`;
      tooltip.style.left = `${x+(fraction>.62?-10:10)}px`;
      tooltip.style.top = `${canvas.offsetTop+meta.pad.top+8}px`;
      tooltip.classList.toggle("align-right",fraction>.62);
      guide.classList.add("visible");
      tooltip.classList.add("visible");
    });
  }

  function drawLineChart(canvas, series, labels, options = {}) {
    if (!canvas || !canvas.offsetWidth) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2), width = canvas.offsetWidth, height = canvas.offsetHeight;
    canvas.width = width * ratio; canvas.height = height * ratio;
    const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio); ctx.clearRect(0,0,width,height);
    const pad = options.showYAxisLabels ? { left:48, right:48, top:12, bottom:24 } : { left:32, right:34, top:12, bottom:24 }, plotW = width-pad.left-pad.right, plotH = height-pad.top-pad.bottom;
    const chartStyle = getComputedStyle(document.documentElement), gridColor = chartStyle.getPropertyValue("--chart-grid").trim() || "#e3e3de", mutedColor = chartStyle.getPropertyValue("--ui-muted").trim() || "#979991";
    const chartCaptionSize = Math.max(7, parseFloat(chartStyle.getPropertyValue("--fs-caption")) || 7);
    const axisFontSize = Number(options.axisFontSize) || chartCaptionSize;
    const axisFontWeight = Number(options.axisFontWeight) || 400;
    const axisFontFamily = options.axisFontFamily || "ui-monospace, monospace";
    ctx.strokeStyle=gridColor; ctx.lineWidth=1; ctx.fillStyle=mutedColor; ctx.font=`${axisFontWeight} ${axisFontSize}px ${axisFontFamily}`;
    canvas.dataset.axisFont = ctx.font;
    canvas.dataset.leftAxisColor = options.leftAxisColor || options.yLabelColor || mutedColor;
    canvas.dataset.rightAxisColor = options.rightAxisColor || options.yLabelColor || mutedColor;
    if(options.showGridLines!==false)for(let i=0;i<5;i++){const y=pad.top+(plotH/4)*i;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(width-pad.right,y);ctx.stroke();}
    const slice = Math.max(1, Math.floor(state.historyRange/5));
    const visibleCount = Math.min(labels.length, options.visibleCount || Math.max(6, Math.floor(state.historyRange/slice)+1) * 12);
    const end = options.fromStart ? visibleCount : labels.length;
    let start = options.fromStart ? 0 : Math.max(0, labels.length-visibleCount);
    let windowEnd = 0, windowStart = 0;
    if (options.windowMinutes) {
      windowEnd = end ? chartPointTime(labels[end-1]) : 0;
      windowStart = windowEnd - Number(options.windowMinutes) * 60000;
      const firstInWindow = labels.findIndex(value => chartPointTime(value) >= windowStart);
      start = firstInWindow < 0 ? 0 : firstInWindow;
    } else if (options.timeScale && end > start) {
      windowStart = chartPointTime(labels[start]);
      windowEnd = chartPointTime(labels[end-1]);
    }
    const xForIndex = (index, count) => {
      if (!options.windowMinutes && !options.timeScale) return pad.left + (count <= 1 ? .5 : index/(count-1)) * plotW;
      const timestamp = chartPointTime(labels[start + index]);
      return pad.left + clamp((timestamp-windowStart) / Math.max(windowEnd-windowStart, 1), 0, 1) * plotW;
    };
    const active=options.ignoreVisibility ? series : series.filter(s=>state.visibleSeries[s.key]);
    const axisBounds = {};
    ["left","right"].forEach(axis=>{
      const values=active.filter(s=>s.axis===axis).flatMap(s=>s.data.slice(start,end)).filter(Number.isFinite); if(!values.length)return;
      let min,max;
      if (options.axisRanges?.[axis]) [min,max] = options.axisRanges[axis];
      else { min=Math.min(...values);max=Math.max(...values);const margin=(max-min||1)*.12;min-=margin;max+=margin; }
      axisBounds[axis] = [min,max];
      active.filter(s=>s.axis===axis).forEach(s=>{
        const data=s.data.slice(start,end); if(!data.length)return; ctx.strokeStyle=s.color;ctx.lineWidth=s.lineWidth||1.7;ctx.lineJoin="round";ctx.setLineDash(s.dash||[]);
        ctx.beginPath();
        let drawing=false,previousY=0,hasLine=false;
        data.forEach((raw,index)=>{
          const value=Number(raw);
          if(raw===undefined)return;
          if(!Number.isFinite(value)){if(!options.connectGaps)drawing=false;return}
          const x=xForIndex(index,data.length),y=pad.top+(1-(value-min)/(max-min))*plotH;
          if(!drawing){ctx.moveTo(x,y);drawing=true}
          else{if(options.stepped)ctx.lineTo(x,previousY);ctx.lineTo(x,y);hasLine=true}
          previousY=y;
        });
        if(hasLine)ctx.stroke();
        ctx.setLineDash([]);
      });
    });
    canvas.dataset.leftAxisRange = axisBounds.left ? axisBounds.left.join(",") : "";
    canvas.dataset.rightAxisRange = axisBounds.right ? axisBounds.right.join(",") : "";
    if (options.showYAxisLabels) {
      ctx.textBaseline = "middle";
      ["left","right"].forEach(axis => {
        const bounds = axisBounds[axis]; if (!bounds) return;
        const [min,max] = bounds, span = max-min;
        const suffix = axis === "left" ? (options.leftAxisSuffix || "") : (options.rightAxisSuffix || "");
        const axisColor = axis === "left" ? (options.leftAxisColor || options.yLabelColor || mutedColor) : (options.rightAxisColor || options.yLabelColor || mutedColor);
        ctx.fillStyle = axisColor;
        ctx.textAlign = axis === "left" ? "right" : "left";
        if (options.binaryAxisLabels && axis === "left") {
          [[1, "在线"], [0, "离线"]].forEach(([binaryValue, label]) => {
            const y = pad.top + (1 - (binaryValue - min) / span) * plotH;
            ctx.fillText(label, pad.left - 8, y);
            ctx.beginPath(); ctx.moveTo(pad.left - 5, y); ctx.lineTo(pad.left, y); ctx.strokeStyle = axisColor; ctx.stroke();
          });
          return;
        }
        for (let i=0;i<5;i++) {
          const y=pad.top+(plotH/4)*i, value=max-(span/4)*i;
          const formatted = options.yLabelFormatter?.(axis, value, i);
          const label = formatted !== undefined ? formatted : span<=10 ? value.toFixed(1) : String(Math.round(value));
          ctx.fillText(`${label}${suffix}`,axis === "left" ? pad.left-8 : width-pad.right+8,y);
          ctx.beginPath();
          ctx.moveTo(axis === "left" ? pad.left-5 : width-pad.right, y);
          ctx.lineTo(axis === "left" ? pad.left : width-pad.right+5, y);
          ctx.strokeStyle=axisColor;ctx.stroke();
        }
      });
      ctx.textBaseline = "alphabetic";
    }
    const shownLabels=labels.slice(start,end); if(shownLabels.length){
      ctx.fillStyle=options.xLabelColor || mutedColor;ctx.textAlign="center";
      const fractions = options.windowMinutes === 10080 ? Array.from({length:7},(_,index)=>(index+.5)/7) : options.windowMinutes >= 43200 ? Array.from({length:6},(_,index)=>index/5) : [0,.25,.5,.75,1];
      const renderedLabels = [];
      fractions.forEach(fr=>{
        const value = options.windowMinutes || options.timeScale ? windowStart + (windowEnd-windowStart)*fr : shownLabels[Math.min(shownLabels.length-1,Math.floor((shownLabels.length-1)*fr))];
        const label = formatChartTimeLabel(value, Number(options.windowMinutes)||0);
        renderedLabels.push(label);
        ctx.fillText(label,pad.left+plotW*fr,height-6);
      });
      canvas.dataset.xAxisLabels = renderedLabels.join("|");
    }
    if(options.showNowMarker&&shownLabels.length){
      const firstTime=options.windowMinutes||options.timeScale?windowStart:chartPointTime(shownLabels[0]),lastTime=options.windowMinutes||options.timeScale?windowEnd:chartPointTime(shownLabels.at(-1)),now=Date.now();
      if(Number.isFinite(firstTime)&&Number.isFinite(lastTime)&&now>=firstTime&&now<=lastTime){
        const timeFraction=clamp((now-firstTime)/Math.max(lastTime-firstTime,1),0,1),fraction=Number.isFinite(options.nowMarkerFraction)?clamp(options.nowMarkerFraction,0,1):options.mirrorNowMarker===false?timeFraction:1-timeFraction,x=pad.left+plotW*fraction;
        ctx.save();ctx.strokeStyle=options.nowMarkerColor||"#ef6f61";ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x,pad.top);ctx.lineTo(x,pad.top+plotH);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=options.nowMarkerColor||"#ef6f61";ctx.textAlign=fraction<.12?"left":fraction>.88?"right":"center";ctx.fillText(`当前 ${formatChartTimeLabel(now,60)}`,x,height-6);ctx.restore();canvas.dataset.currentTimeX=String(x);
      }else canvas.dataset.currentTimeX="";
    }else canvas.dataset.currentTimeX="";
    canvas._astraHoverMeta = { active, labels, shownLabels, start, end, pad, plotW, plotH, windowStart, windowEnd, axisBounds, options };
    bindChartHover(canvas);
    restoreChartMarkers(canvas);
  }

  function exportCsv() {
    const rows = [["timestamp","solar_current_a","charge_current_a","battery_percent","temperature_c","humidity_percent"]];
    const cell=value=>Number.isFinite(Number(value))?Number(value):"";
    state.history.labels.forEach((label,i)=>rows.push([new Date(label).toISOString(),cell(state.history.solar[i]),cell(state.history.charge[i]),cell(state.history.battery[i]),cell(state.history.temperature[i]),cell(state.history.humidity[i])]));
    const blob=new Blob(["\ufeff"+rows.map(row=>row.join(",")).join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`astra-history-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);toast("数据已导出","CSV 文件已保存到下载目录。","ok");
  }

  function astronomyScores({ cloud, precipitation, humidity, visibility, wind }) {
    if (![cloud,precipitation,humidity,visibility,wind].every(hasNumber)) return null;
    const visibilityScore = clamp(Number(visibility) / 20000 * 100, 0, 100);
    const seeing = clamp(100 - Number(wind) * 2.7 - Math.max(0, Number(humidity) - 55) * .45 - Number(cloud) * .16 + visibilityScore * .18, 0, 100);
    const clear = clamp(100 - Number(cloud) * .76 - Math.min(Number(precipitation) * 28, 45) - Math.max(0, Number(humidity) - 88) * .8, 0, 100);
    return { seeing:Math.round(seeing), clear:Math.round(clear) };
  }

  function clearForecastSummary(message="尚未选择预报地点"){
    ["#forecast-temp","#forecast-humidity","#forecast-cloud","#forecast-rain","#forecast-seeing","#forecast-clear"].forEach(selector=>setText(selector,"--"));
    setText("#forecast-updated",message);
  }

  function renderForecast() {
    const forecast = state.forecast, hourly = forecast.hourly;
    const location=forecast.location;
    if(!location||!hasNumber(location.latitude)||!hasNumber(location.longitude)){
      setText("#forecast-location-name","尚未选择预报地点");setText("#forecast-location-coords","--");clearForecastSummary();renderSeeingSource();drawForecastCharts();return;
    }
    const locationPartKeys=new Set(),locationParts=[location.name,location.admin1,location.country].filter(Boolean).filter(part=>{const key=String(part).trim().replace(/[市省州县区]$/u,"").toLocaleLowerCase();if(locationPartKeys.has(key))return false;locationPartKeys.add(key);return true});
    setText("#forecast-location-name", locationParts.join(" · ")||"已选择地点");
    const lat = Number(location.latitude), lon = Number(location.longitude);
    setText("#forecast-location-coords", `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} · ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`);
    if (!hourly.time.length) { clearForecastSummary(forecast.loading?"正在获取真实天气数据…":"天气数据暂不可用");renderSeeingSource();drawForecastCharts();return; }
    let index = hourly.time.findIndex(value => new Date(value).getTime() >= Date.now());
    if (index < 0) index = 0;
    setText("#forecast-temp", hasNumber(hourly.temperature[index])?fmt(hourly.temperature[index]):"--");
    setText("#forecast-humidity", hasNumber(hourly.humidity[index])?Math.round(hourly.humidity[index]):"--");
    setText("#forecast-cloud", hasNumber(hourly.cloud[index])?Math.round(hourly.cloud[index]):"--");
    setText("#forecast-rain", hasNumber(hourly.precipitation[index])?fmt(hourly.precipitation[index], 1):"--");
    setText("#forecast-clear", hasNumber(hourly.clear[index])?Math.round(hourly.clear[index]):"--");
    setText("#forecast-updated", `更新于 ${timestamp().slice(0,5)} · ${forecast.timezone}`);
    $$('[data-forecast-range]').forEach(button => button.classList.toggle("active", Number(button.dataset.forecastRange) === state.forecastRange));
    $$('[data-forecast-y-range]').forEach(button => button.classList.toggle("active", button.dataset.forecastYRange === state.forecastYRange));
    renderSeeingSource();
    drawForecastCharts();
  }

  async function loadForecast(location = state.forecast.location) {
    if(!location||!hasNumber(location.latitude)||!hasNumber(location.longitude)){state.forecast.location=null;state.forecast.loading=false;renderForecast();return}
    state.forecast.location = location;
    state.forecast.loading = true;
    state.forecast.hourly = { time: [], temperature: [], humidity: [], cloud: [], precipitation: [], visibility: [], wind: [], seeing: [], clear: [] };
    Object.assign(state.sevenTimer,{labels:[],seeing:[],clear:[],transparency:[],cloud:[],loading:false,error:"",init:"",updatedAt:0});
    void loadSevenTimer(location);
    setText("#forecast-updated", "正在获取天气…");
    renderForecast();
    const params = new URLSearchParams({
      latitude:String(location.latitude), longitude:String(location.longitude), timezone:"auto", forecast_days:"7",
      hourly:"temperature_2m,relative_humidity_2m,cloud_cover,precipitation,visibility,wind_speed_10m"
    });
    try {
      const data = await apiRequest(`/api/weather/forecast?${params}`);
      const h = data.hourly;
      if(!h||!Array.isArray(h.time)||!h.time.length)throw new Error("Open-Meteo returned no hourly data");
      const seeing = [], clear = [];
      h.time.forEach((_, index) => {
        const score = astronomyScores({ cloud:h.cloud_cover[index], precipitation:h.precipitation[index], humidity:h.relative_humidity_2m[index], visibility:h.visibility[index], wind:h.wind_speed_10m[index] });
        seeing.push(score?.seeing ?? NaN); clear.push(score?.clear ?? NaN);
      });
      const readings=values=>h.time.map((_,index)=>hasNumber(values?.[index])?Number(values[index]):NaN);
      state.forecast.timezone = data.timezone || "当地时间";
      state.forecast.hourly = {
        time:h.time, temperature:readings(h.temperature_2m), humidity:readings(h.relative_humidity_2m), cloud:readings(h.cloud_cover),
        precipitation:readings(h.precipitation), visibility:readings(h.visibility), wind:readings(h.wind_speed_10m), seeing, clear
      };
      state.forecast.loading = false;
      localStorage.setItem("astra.weather.location", JSON.stringify(location));
      renderForecast();
    } catch (error) {
      state.forecast.loading = false;
      state.forecast.hourly = { time: [], temperature: [], humidity: [], cloud: [], precipitation: [], visibility: [], wind: [], seeing: [], clear: [] };
      renderForecast();
      toast("天气获取失败", "请检查网络后重新选择地点。", "error");
    }
  }

  async function searchWeatherLocations(query) {
    const results = $("#weather-location-results");
    const input = $("#weather-location-search");
    const submit = $("#weather-location-submit");
    const normalized = String(query || "").trim();
    const minimumLength = /[\u3400-\u9fff]/.test(normalized) ? 1 : 2;
    if (!results) return;
    if (!normalized) {
      results.hidden = true;
      input?.setAttribute("aria-expanded", "false");
      return;
    }
    results.hidden = false;
    input?.setAttribute("aria-expanded", "true");
    if (normalized.length < minimumLength) {
      results.innerHTML = `<span class="location-loading">请继续输入地点名称</span>`;
      return;
    }
    const requestSequence = ++weatherSearchSequence;
    results.innerHTML = `<span class="location-loading">正在搜索地点…</span>`;
    if (submit) { submit.disabled = true; submit.textContent = "搜索中…"; }
    try {
      const aliases = { "厦门":"Xiamen", "济州":"Jeju", "济州岛":"Jeju", "首尔":"Seoul", "釜山":"Busan", "제주":"Jeju", "서울":"Seoul", "부산":"Busan" };
      const lookupNames = [normalized, aliases[normalized]].filter(Boolean).filter((name,index,names)=>names.indexOf(name)===index);
      let data = { results:[] };
      for (const lookupName of lookupNames) {
        data = await apiRequest(`/api/weather/geocoding?name=${encodeURIComponent(lookupName)}&count=7&language=zh`);
        if (data.results?.length) break;
      }
      if (requestSequence !== weatherSearchSequence) return;
      const locations = data.results || [];
      results.innerHTML = locations.length ? locations.map((location, index) => `<button type="button" role="option" data-weather-location="${index}"><i></i><span><b>${escapeHtml(location.name)}</b><small>${escapeHtml([location.admin1, location.country].filter(Boolean).join(" · "))}</small></span><em>${Number(location.latitude).toFixed(2)}, ${Number(location.longitude).toFixed(2)}</em></button>`).join("") : `<span class="location-loading">未找到“${escapeHtml(normalized)}”，请尝试完整城市名</span>`;
      results._locations = locations;
    } catch (error) {
      if (requestSequence === weatherSearchSequence) results.innerHTML = `<span class="location-loading">地点搜索失败，请检查网络后重试</span>`;
    } finally {
      if (requestSequence === weatherSearchSequence && submit) { submit.disabled = false; submit.textContent = "查找地点"; }
    }
  }

  function useCurrentWeatherLocation() {
    const button = $("#weather-location-current");
    const buttonLabel = button?.querySelector("span");
    const input = $("#weather-location-search");
    const results = $("#weather-location-results");
    const finish = () => {
      if (button) { button.disabled = false; button.classList.remove("locating"); }
      if (buttonLabel) buttonLabel.textContent = "当前位置";
    };
    const fail = message => {
      finish();
      if (results) { results.hidden = false; results.innerHTML = `<span class="location-loading">${escapeHtml(message)}</span>`; }
      input?.setAttribute("aria-expanded", "true");
      toast("无法获取当前位置", message, "error");
    };
    if (!window.isSecureContext || !navigator.geolocation) {
      fail("当前浏览器不支持定位，请使用 HTTPS 或本机地址访问。");
      return;
    }
    clearTimeout(weatherSearchTimer);
    weatherSearchSequence += 1;
    if (button) { button.disabled = true; button.classList.add("locating"); }
    if (buttonLabel) buttonLabel.textContent = "定位中…";
    if (results) { results.hidden = false; results.innerHTML = `<span class="location-loading">正在获取设备位置…</span>`; }
    input?.setAttribute("aria-expanded", "true");
    navigator.geolocation.getCurrentPosition(position => {
      const latitude = Number(position.coords.latitude);
      const longitude = Number(position.coords.longitude);
      const accuracy = Math.max(1, Math.round(Number(position.coords.accuracy) || 0));
      const location = { name:"当前位置", admin1:`精度约 ${accuracy} m`, country:"设备定位", latitude, longitude };
      finish();
      if (results) results.hidden = true;
      if (input) { input.value = "当前位置"; input.setAttribute("aria-expanded", "false"); }
      loadForecast(location);
      toast("位置已更新", `已按当前坐标加载天气 · 精度约 ${accuracy} m`, "ok");
    }, error => {
      const messages = {
        1:"定位权限未授予，请在浏览器地址栏允许位置权限后重试。",
        2:"设备暂时无法确定位置，请检查系统定位服务。",
        3:"定位请求超时，请移动到信号更好的位置后重试。"
      };
      fail(messages[error.code] || "获取当前位置时发生未知错误，请稍后重试。");
    }, { enableHighAccuracy:true, timeout:12000, maximumAge:300000 });
  }

  function applyPreferences(notify = false) {
    document.documentElement.dataset.themeColor = state.themeColor;
    document.documentElement.dataset.colorMode = state.colorMode;
    document.documentElement.dataset.fontSize = state.fontSize;
    $$('button[data-theme-color]').forEach(button => button.classList.toggle("active", button.dataset.themeColor === state.themeColor));
    $$('button[data-color-mode]').forEach(button => button.classList.toggle("active", button.dataset.colorMode === state.colorMode));
    $$('button[data-font-size]').forEach(button => button.classList.toggle("active", button.dataset.fontSize === state.fontSize));
    localStorage.setItem("astra.themeColor", state.themeColor);
    localStorage.setItem("astra.colorMode", state.colorMode);
    localStorage.setItem("astra.fontSize", state.fontSize);
    localStorage.setItem("astra.fontScaleVersion", "2");
    drawCharts();
  }

  async function authApi(path, options = {}) {
    if (isNativeRuntime()) {
      if (path === "/login") {
        const body = JSON.parse(options.body || "{}");
        const result = await nativeInvoke("native_login", { body });
        return result;
      }
      if (path === "/session/refresh") return nativeInvoke("native_refresh");
      return nativeRequest(`/api/v1/auth${path}`, options);
    }
    const response = await fetch(`/api/v1/auth${path}`, {
      credentials: "include",
      cache: "no-store",
      ...options,
      headers: { "Content-Type":"application/json", ...(options.headers || {}) }
    });
    const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(typeof data.detail === "string" ? data.detail : `请求失败 (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function authErrorMessage(error) {
    const detail = String(error?.message || "请求失败");
    if (/Account does not exist/i.test(detail)) return "该账号不存在，请检查手机号或邮箱。";
    if (/Password is incorrect/i.test(detail)) return "密码错误，请重新输入。";
    if (/Account is disabled/i.test(detail)) return "该账号已被停用，请联系管理员。";
    if (/Invalid account or password/i.test(detail)) return "账号或密码不正确。";
    if (/Account already exists/i.test(detail)) return "该手机号或邮箱已经注册，请直接登录。";
    if (/Invalid verification code/i.test(detail)) return "验证码不正确或已失效。";
    if (/Too many verification attempts/i.test(detail)) return "验证码错误次数过多，请重新获取。";
    if (/Retry after (\d+)/i.test(detail)) return `发送过于频繁，请在 ${RegExp.$1} 秒后重试。`;
    if (/provider is not configured/i.test(detail)) return "验证服务尚未配置完成。";
    if (/Verification delivery failed/i.test(detail)) return "验证码发送失败，请稍后重试。";
    if (/Current password is incorrect/i.test(detail)) return "当前密码不正确。";
    if (/Browser did not retain session cookie/i.test(detail)) return "Safari 未能保存登录会话。请确认未开启“阻止所有 Cookie”，然后彻底关闭并重新打开 ASTRA。";
    if (/Administrator password must contain at least 9 characters/i.test(detail)) return "管理员密码至少需要 9 个字符。";
    if (error?.status === 401) return "登录会话已失效，请重新登录后继续。";
    if (error?.status === 422) return "请检查输入格式后重试。";
    if (error?.status >= 500) return "验证服务暂时不可用，请稍后重试。";
    return detail;
  }

  function setAuthMessage(message, type = "") {
    const node = $("#auth-message");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("error", type === "error");
    node.classList.toggle("ok", type === "ok");
  }

  function authContact(user) {
    return user?.email || user?.phone || "已验证账户";
  }

  function authRoleLabel(role) {
    return ({ admin:"Administrator", operator:"Operator", user:"User", viewer:"Viewer" })[role] || "Member";
  }

  function profileAvatarStorageKey(user=state.auth.user){
    const identity=user?.id||user?.email||user?.phone;
    return identity?`astra.profileAvatar.${identity}`:"";
  }

  function renderAuthIdentity() {
    const user = state.auth.user;
    const profileName = $("#page-profile .profile-hero > div:nth-child(2) h2");
    const profileDetail = $("#page-profile .profile-hero > div:nth-child(2) p");
    const avatar = $("#page-profile .profile-avatar");
    const avatarInitials = avatar?.querySelector(".profile-avatar-initials");
    const operatorAvatar = $(".operator > span");
    const operatorName = $(".operator b");
    const operatorRole = $(".operator small");
    if (user) {
      const name = user.display_name || "ASTRA 用户";
      const mark = name.trim().slice(0, 2).toUpperCase() || "A";
      if (profileName) profileName.textContent = name;
      if (profileDetail) profileDetail.textContent = `账号 · ${authContact(user)}`;
      if (avatar) {
        const avatarKey=profileAvatarStorageKey(user),savedAvatar=avatarKey?localStorage.getItem(avatarKey):"";
        if (avatarInitials) avatarInitials.textContent = savedAvatar ? "" : mark;
        avatar.style.backgroundImage = savedAvatar ? `url("${savedAvatar}")` : "";
        avatar.classList.toggle("has-image", Boolean(savedAvatar));
      }
      if (operatorAvatar) {
        const avatarKey=profileAvatarStorageKey(user),savedAvatar=avatarKey?localStorage.getItem(avatarKey):"";
        operatorAvatar.textContent = savedAvatar ? "" : mark;
        operatorAvatar.style.backgroundImage = savedAvatar ? `url("${savedAvatar}")` : "";
        operatorAvatar.classList.toggle("has-image", Boolean(savedAvatar));
      }
      if (operatorName) operatorName.textContent = name;
      if (operatorRole) operatorRole.textContent = authRoleLabel(user.role);
      document.querySelector(".operator")?.setAttribute("data-route-jump", "profile");
      const newPassword = $("#new-password");
      if (newPassword) {
        const minimum = user.role === "admin" ? 9 : 8;
        newPassword.minLength = minimum;
        newPassword.placeholder = `至少 ${minimum} 个字符`;
      }
    } else if (!state.auth.loading) {
      if (profileName) profileName.textContent = "访客会话";
      if (profileDetail) profileDetail.textContent = "登录后启用账户验证与跨设备会话";
      if (avatarInitials) avatarInitials.textContent = "--";
      if (avatar) { avatar.style.backgroundImage = ""; avatar.classList.remove("has-image"); }
      if (operatorAvatar) { operatorAvatar.textContent = "--"; operatorAvatar.style.backgroundImage = ""; operatorAvatar.classList.remove("has-image"); }
      if (operatorName) operatorName.textContent = "未登录";
      if (operatorRole) operatorRole.textContent = "Guest";
      document.querySelector(".operator")?.setAttribute("data-route-jump", "login");
    }
  }

  function setProfileModal(modal, open) {
    if (!modal) return;
    modal.classList.toggle("open", open);
    modal.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) modal.querySelector("input")?.focus();
  }

  function buildProfileControls() {
    const hero = $("#page-profile .profile-hero");
    const identity = hero?.children[1];
    const avatar = hero?.querySelector(".profile-avatar");
    const accountSettingsCard = $("#account-settings-card");
    const openPasswordButton = $("#open-password-modal");
    const passwordForm = $("#password-change-form");
    if (!hero || !identity || !avatar || !accountSettingsCard || !openPasswordButton || !passwordForm || $("#password-modal")) return;

    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.id = "open-name-modal";
    nameButton.className = "profile-edit-button";
    nameButton.textContent = "编辑名称";
    identity.append(nameButton);

    const avatarInput = document.createElement("input");
    avatarInput.type = "file";
    avatarInput.id = "profile-avatar-input";
    avatarInput.accept = "image/png,image/jpeg,image/webp,image/gif";
    avatarInput.hidden = true;
    avatarInput.setAttribute("aria-label", "上传头像");
    hero.append(avatarInput);
    avatar.title = "点击上传头像";
    avatar.addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", () => {
      const file = avatarInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
        toast("头像上传失败", "请选择 2 MB 以内的图片。", "error");
        avatarInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const avatarKey=profileAvatarStorageKey();
        if(!avatarKey){toast("头像上传失败","当前账户信息不可用。","error","background");return}
        localStorage.setItem(avatarKey, String(reader.result));
        renderAuthIdentity();
        toast("头像已更新", "图片已保存在当前浏览器。", "ok");
      };
      reader.readAsDataURL(file);
    });

    const passwordModal = document.createElement("div");
    passwordModal.id = "password-modal";
    passwordModal.className = "profile-modal-backdrop";
    passwordModal.setAttribute("aria-hidden", "true");
    passwordModal.innerHTML = `<div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title"><header><h3 id="password-modal-title">修改密码</h3><button type="button" aria-label="关闭">×</button></header></div>`;
    document.body.append(passwordModal);
    passwordModal.querySelector(".profile-modal").append(passwordForm);

    const nameModal = document.createElement("div");
    nameModal.id = "name-modal";
    nameModal.className = "profile-modal-backdrop";
    nameModal.setAttribute("aria-hidden", "true");
    nameModal.innerHTML = `<div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="name-modal-title"><header><h3 id="name-modal-title">修改显示名称</h3><button type="button" aria-label="关闭">×</button></header><form class="profile-name-form"><label class="auth-field"><span>显示名称</span><input id="profile-name-input" maxlength="40" autocomplete="nickname" required></label><p class="auth-message" id="profile-name-message" role="status" aria-live="polite"></p><button class="primary-button" type="submit">保存名称</button></form></div>`;
    document.body.append(nameModal);

    const openPassword = () => setProfileModal(passwordModal, true);
    const closePassword = () => setProfileModal(passwordModal, false);
    const openName = () => {
      const input = $("#profile-name-input");
      if (input) input.value = state.auth.user?.display_name || "";
      setProfileModal(nameModal, true);
    };
    const closeName = () => setProfileModal(nameModal, false);
    openPasswordButton.addEventListener("click", openPassword);
    nameButton.addEventListener("click", event => { event.stopPropagation(); openName(); });
    passwordModal.querySelector("header button")?.addEventListener("click", closePassword);
    nameModal.querySelector("header button")?.addEventListener("click", closeName);
    passwordModal.addEventListener("click", event => { if (event.target === passwordModal) closePassword(); });
    nameModal.addEventListener("click", event => { if (event.target === nameModal) closeName(); });
    nameModal.querySelector("form")?.addEventListener("submit", async event => {
      event.preventDefault();
      const input = $("#profile-name-input");
      const message = $("#profile-name-message");
      const displayName = input?.value.trim() || "";
      if (!displayName) { if (message) message.textContent = "请输入显示名称。"; return; }
      const submit = nameModal.querySelector("button[type=submit]");
      if (submit) submit.disabled = true;
      try {
        const result = await authApi("/profile", { method:"PATCH", body:JSON.stringify({ display_name:displayName }) });
        state.auth.user = result.user;
        renderAuthIdentity(); renderAuth(); closeName();
        toast("名称已更新", "新的显示名称已同步到账户。", "ok");
      } catch (error) {
        if (message) message.textContent = authErrorMessage(error);
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  function closePasswordModal() {
    setProfileModal($("#password-modal"), false);
  }

  function updateAuthCodeButton() {
    const button = $("#auth-send-code");
    if (!button) return;
    if (state.auth.cooldown > 0) {
      button.disabled = true;
      button.textContent = `${state.auth.cooldown}s 后重试`;
    } else {
      button.disabled = false;
      button.textContent = "发送验证码";
    }
  }

  function startAuthCooldown(seconds = 60) {
    clearInterval(authCooldownTimer);
    state.auth.cooldown = Math.max(0, Number(seconds) || 0);
    updateAuthCodeButton();
    if (!state.auth.cooldown) return;
    authCooldownTimer = setInterval(() => {
      state.auth.cooldown = Math.max(0, state.auth.cooldown - 1);
      updateAuthCodeButton();
      if (!state.auth.cooldown) clearInterval(authCooldownTimer);
    }, 1000);
  }

  function renderAuth() {
    const loggedIn = Boolean(state.auth.user);
    const mode = state.auth.mode;
    const channel = state.auth.channel;
    const form = $("#auth-form");
    const status = $("#auth-status-chip");
    const profileStatus=$("#profile-auth-status");
    if (form) form.hidden = loggedIn;
    if (form) form.dataset.authMode = mode;
    if (status) {
      status.textContent = state.auth.loading ? "检查会话" : (loggedIn ? "已验证 · 在线" : "未登录");
      status.classList.toggle("online", loggedIn);
    }
    if(profileStatus){profileStatus.textContent=state.auth.loading?"检查会话":loggedIn?"已登录会话":"未登录";profileStatus.classList.toggle("online",loggedIn)}
    if (loggedIn) {
      renderAuthIdentity();
      return;
    }
    const authTitle = { login:"登录", register:"创建账户", recover:"找回密码" }[mode] || "登录";
    const authSubtitle = { login:"使用邮箱或手机号进入控制台", register:"通过短信或邮箱验证码完成注册", recover:"验证账户后设置新的登录密码" }[mode] || "使用邮箱或手机号进入控制台";
    setText("#auth-title", authTitle);
    setText("#auth-subtitle", authSubtitle);
    $$('[data-auth-mode]').forEach(button => button.classList.toggle("active", button.dataset.authMode === mode));
    $$('[data-auth-channel]').forEach(button => button.classList.toggle("active", button.dataset.authChannel === channel));
    const needsCode = mode !== "login";
    $("#auth-channel").hidden = !needsCode;
    $("#auth-display-field").hidden = mode !== "register";
    $("#auth-identifier-field").hidden = mode !== "login";
    $("#auth-target-field").hidden = !needsCode;
    $("#auth-code-row").hidden = !needsCode;
    $("#auth-confirm-field").hidden = !needsCode;
    const target = $("#auth-target");
    const targetLabel = $("#auth-target-label");
    if (target && targetLabel) {
      const isPhone = channel === "phone";
      target.type = isPhone ? "tel" : "email";
      target.inputMode = isPhone ? "tel" : "email";
      target.autocomplete = isPhone ? "tel" : "email";
      target.placeholder = isPhone ? "请输入中国内地手机号" : "请输入电子邮箱";
      targetLabel.textContent = isPhone ? "手机号码" : "电子邮箱";
    }
    const password = $("#auth-password");
    password.autocomplete = mode === "login" ? "current-password" : "new-password";
    password.minLength = mode === "login" ? 0 : 9;
    password.placeholder = mode === "login" ? "" : "至少 9 位";
    setText("#auth-password-label", mode === "login" ? "密码" : (mode === "register" ? "设置密码" : "新密码"));
    setText("#auth-submit", mode === "login" ? "登录" : (mode === "register" ? "创建账户" : "重置密码"));
    updateAuthCodeButton();
    renderAuthIdentity();
  }

  function setAuthMode(mode) {
    if (!["login", "register", "recover"].includes(mode)) return;
    state.auth.mode = mode;
    $("#auth-form")?.reset();
    setAuthMessage(mode === "login" ? "使用邮箱或手机号登录。" : (mode === "register" ? "先获取验证码，再创建账户。" : "验证账户后设置新密码。"));
    renderAuth();
  }

  async function loadAuthSession() {
    state.auth.loading = true;
    renderAuth();
    try {
      if (isNativeRuntime()) await nativeInvoke("load_native_token").catch(() => null);
      if (localStorage.getItem("astra.logoutPending") === "1") {
        await authApi("/logout", { method:"POST" });
        localStorage.removeItem("astra.logoutPending");
      }
      const result = await authApi("/me", { method:"GET" });
      state.auth.user = result.user;
      const authorizationLoaded = await loadControllerConnection();
      if (authorizationLoaded && !state.controller.configured) {
        try { await autoAssignController(); } catch (_) { /* keep settings available when no group is free */ }
      }
      if (state.controller.configured) connectEventStream(); else openSettings();
    } catch (error) {
      if (error.status !== 401) setAuthMessage(authErrorMessage(error), "error");
      state.auth.user = null;
      disconnectEventStream();
      buildHistory(); drawPowerHistoryChart(); drawEnvironmentLiveChart();
    } finally {
      state.auth.loading = false;
      renderAuth();
      if (state.auth.user) { loadDeviceHistory(); loadTelemetryHistory(); }
      if (state.auth.user && state.route === "login") {
        const target = state.auth.returnRoute || "overview";
        state.auth.returnRoute = null;
        routeTo(target);
      } else if (!state.auth.user && state.route !== "login") {
        routeTo("login");
      }
    }
  }

  async function requestAuthCode() {
    const target = $("#auth-target").value.trim();
    const isPhone = state.auth.channel === "phone";
    if (isPhone ? !/^1[3-9]\d{9}$/.test(target) : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setAuthMessage(isPhone ? "请输入正确的中国内地手机号。" : "请输入正确的电子邮箱。", "error");
      return;
    }
    const button = $("#auth-send-code");
    button.disabled = true;
    button.textContent = "发送中…";
    try {
      const purpose = state.auth.mode === "recover" ? "recover" : "register";
      const result = await authApi("/verification/request", {
        method:"POST",
        body:JSON.stringify({ channel:state.auth.channel, target, purpose })
      });
      startAuthCooldown(60);
      setAuthMessage(`验证码已发送，${Math.round((result.expires_in || 600) / 60)} 分钟内有效。`, "ok");
      $("#auth-code").focus();
    } catch (error) {
      const retry = String(error.message || "").match(/Retry after (\d+)/i);
      if (retry) startAuthCooldown(Number(retry[1])); else updateAuthCodeButton();
      setAuthMessage(authErrorMessage(error), "error");
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    const mode = state.auth.mode;
    const password = $("#auth-password").value;
    const submit = $("#auth-submit");
    if (mode === "login" && !$("#auth-identifier").value.trim()) { setAuthMessage("请输入邮箱或手机号。", "error"); return; }
    if (!password) { setAuthMessage("请输入密码。", "error"); return; }
    if (mode !== "login" && password.length < 9) { setAuthMessage("新密码格式不符合要求。", "error"); return; }
    let path = "/login";
    let body = { identifier:$("#auth-identifier").value.trim(), password };
    if (mode !== "login") {
      const confirm = $("#auth-password-confirm").value;
      if (password !== confirm) { setAuthMessage("两次输入的密码不一致。", "error"); return; }
      const target = $("#auth-target").value.trim();
      const code = $("#auth-code").value.trim();
      if (!/^\d{6}$/.test(code)) { setAuthMessage("请输入收到的 6 位验证码。", "error"); return; }
      body = { channel:state.auth.channel, target, code, password };
      if (mode === "register") {
        const displayName = $("#auth-display-name").value.trim();
        if (!displayName) { setAuthMessage("请输入显示名称。", "error"); return; }
        body.display_name = displayName;
        path = "/register";
      } else {
        path = "/password/recover";
      }
    }
    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = "处理中…";
    try {
      let result = await authApi(path, { method:"POST", body:JSON.stringify(body) });
      if (mode === "recover") {
        setAuthMode("login");
        $("#auth-identifier").value = body.target;
        setAuthMessage("密码已重置，请使用新密码登录。", "ok");
        toast("密码已重置", "现在可以使用新密码登录。", "ok");
      } else {
        if (!isNativeRuntime()) {
          try {
            result = await authApi("/me", { method:"GET" });
          } catch (error) {
            if (error.status === 401) {
              const cookieError = new Error("Browser did not retain session cookie");
              cookieError.status = 401;
              throw cookieError;
            }
            throw error;
          }
        }
        state.auth.user = result.user;
        state.auth.loading = false;
        renderAuth();
        await loadControllerConnection();
        if (state.controller.configured) connectEventStream(); else openSettings();
        loadDeviceHistory();
        toast(mode === "register" ? "账户创建成功" : "登录成功", "账户会话已安全建立。", "ok");
        const target = state.auth.returnRoute || "profile";
        state.auth.returnRoute = null;
        routeTo(target);
      }
    } catch (error) {
      setAuthMessage(authErrorMessage(error), "error");
    } finally {
      submit.disabled = false;
      if (!state.auth.user && state.auth.mode === mode) submit.textContent = original;
    }
  }

  async function logoutAuth(event) {
    const button = event?.currentTarget || $("#auth-logout");
    const original = button?.textContent || "退出登录";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    let serverSessionEnded = false;
    try { localStorage.setItem("astra.logoutPending", "1"); } catch {}
    if (button) { button.disabled = true; button.textContent = "正在退出…"; }
    state.auth.user = null;
    state.auth.loading = false;
    state.auth.returnRoute = null;
    state.controller = { configured:false, loading:false, data:null, requests:[], error:"" };
    renderControllerConnection();
    disconnectEventStream();
    buildHistory(); drawPowerHistoryChart(); drawEnvironmentLiveChart();
    state.deviceHistory.devices = []; state.deviceHistory.alerts = []; state.deviceHistory.labels = []; state.deviceHistory.series = {};
    drawDeviceHistoryChart();
    setAuthMode("login");
    routeTo("login");
    try {
      await authApi("/logout", { method:"POST", signal:controller.signal });
      if (isNativeRuntime()) await nativeInvoke("clear_native_token").catch(() => {});
      serverSessionEnded = true;
      try { localStorage.removeItem("astra.logoutPending"); } catch {}
    } catch (error) {
      console.warn("Unable to confirm server logout; keeping a retry marker", error);
    } finally {
      window.clearTimeout(timeout);
      if (button) { button.disabled = false; button.textContent = original; }
      toast(
        serverSessionEnded ? "已退出登录" : "已返回登录界面",
        serverSessionEnded ? "当前浏览器会话已经结束。" : "服务端暂时不可用，将在下次打开时继续完成退出。",
        serverSessionEnded ? "ok" : "warn"
      );
    }
  }

  function setPasswordChangeMessage(message, type = "") {
    const node = $("#password-change-message");
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("error", type === "error");
    node.classList.toggle("ok", type === "ok");
  }

  async function changeAccountPassword(event) {
    event.preventDefault();
    if (!state.auth.user) { routeTo("login"); return; }
    const currentPassword = $("#current-password").value;
    const newPassword = $("#new-password").value;
    const confirmation = $("#new-password-confirm").value;
    if (!currentPassword) { setPasswordChangeMessage("请输入当前密码。", "error"); return; }
    const minimum = 9;
    if (newPassword.length < minimum) { setPasswordChangeMessage(`新密码至少需要 ${minimum} 个字符。`, "error"); return; }
    if (newPassword !== confirmation) { setPasswordChangeMessage("两次输入的新密码不一致。", "error"); return; }
    if (currentPassword === newPassword) { setPasswordChangeMessage("新密码不能与当前密码相同。", "error"); return; }
    const button = $("#password-change-submit");
    button.disabled = true;
    button.textContent = "更新中…";
    try {
      await authApi("/password/change", { method:"POST", body:JSON.stringify({ current_password:currentPassword, new_password:newPassword }) });
      $("#password-change-form").reset();
      closePasswordModal();
      setPasswordChangeMessage("密码已更新，其他设备上的登录会话已失效。", "ok");
      toast("密码更新成功", "当前设备继续保持登录。", "ok");
    } catch (error) {
      if (error?.status === 401) {
        state.auth.user = null;
        state.auth.loading = false;
        disconnectEventStream();
        closePasswordModal();
        setAuthMode("login");
        routeTo("login");
        toast("请重新登录", "原登录会话已失效，重新登录后即可更新密码。", "warn");
        return;
      }
      setPasswordChangeMessage(authErrorMessage(error), "error");
    } finally {
      button.disabled = false;
      button.textContent = "更新密码";
    }
  }

  function bindVerticalNumberDrag(input) {
    if (!input) return;
    let dragging=false,startY=0,startValue=0,lastValue=0;
    const finish=event=>{if(!dragging)return;dragging=false;input.classList.remove("dragging");if(input.hasPointerCapture?.(event.pointerId))input.releasePointerCapture(event.pointerId)};
    input.addEventListener("pointerdown",event=>{if(event.button!==0||input.disabled)return;dragging=true;startY=event.clientY;startValue=hasNumber(input.value)?Number(input.value):0;lastValue=startValue;input.classList.add("dragging");input.setPointerCapture?.(event.pointerId);event.preventDefault()});
    input.addEventListener("pointermove",event=>{if(!dragging)return;const min=number(input.min,0),max=number(input.max,Infinity),value=clamp(Math.round(startValue+(startY-event.clientY)/10),min,max);if(value!==lastValue){lastValue=value;input.value=String(value);input.dispatchEvent(new Event("input",{bubbles:true}))}event.preventDefault()});
    input.addEventListener("pointerup",finish);input.addEventListener("pointercancel",finish);input.addEventListener("lostpointercapture",finish);
  }

  function requestBluetoothToggle() {
    const button=$("#onstep-bluetooth-status");
    if(!isDeviceOnline("esp32-001")){toast("主控离线","没有真实设备连接，无法切换蓝牙。","error","background");return}
    const next=!bool(state.main.bluetooth);
    if(sendCommand("esp32-001",{command:"bluetooth",state:next},next?"连接 OnStep 蓝牙":"断开 OnStep 蓝牙")){
      button?.classList.add("pending");
      window.setTimeout(()=>button?.classList.remove("pending"),8000);
    }
  }

  async function initNativeServerSettings() {
    const card = $("#server-settings-card");
    if (!isNativeRuntime()) return;
    if (card) card.hidden = false;
    const input = $("#native-server-url");
    const message = $("#server-settings-message");
    const normalizeServer = value => new URL(value.trim()).origin.replace(/\/$/, "");
    const saved = localStorage.getItem("astra.nativeServerUrl") || "https://astroy.xyz";
    let activeServer = "https://astroy.xyz";
    try { activeServer = normalizeServer(saved); }
    catch (_) { localStorage.setItem("astra.nativeServerUrl", activeServer); }
    if (input) input.value = activeServer;
    try {
      await nativeInvoke("set_server", { server: activeServer });
      await nativeRequest("/health");
      if (message) { message.textContent = "服务器连接正常"; message.className = "auth-message ok"; }
    } catch (error) {
      if (message) { message.textContent = `服务器连接失败：${error?.message || "请检查网络"}`; message.className = "auth-message error"; }
    }
    $("#server-settings-form")?.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const server = normalizeServer(input?.value || "");
        localStorage.setItem("astra.nativeServerUrl", server);
        if (state.auth.user && server !== activeServer) {
          if (input) input.value = server;
          if (message) { message.textContent = "服务器地址已保存，当前会话保持连接；下次启动时应用新地址。"; message.className = "auth-message ok"; }
          return;
        }
        await nativeInvoke("set_server", { server });
        activeServer = server;
        await nativeRequest("/health");
        if (message) { message.textContent = state.auth.user ? "服务器连接正常，当前会话保持登录。" : "服务器连接正常，地址已保存。"; message.className = "auth-message ok"; }
      } catch (error) {
        if (message) { message.textContent = error?.message || "服务器地址无效"; message.className = "auth-message error"; }
      }
    });
  }

  function bindEvents() {
    buildProfileControls();
    $$('[data-auth-mode]').forEach(button => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
    $$('[data-auth-channel]').forEach(button => button.addEventListener("click", () => { state.auth.channel = button.dataset.authChannel; setAuthMessage(state.auth.channel === "phone" ? "验证码将通过阿里云短信认证发送。" : "验证码将发送到指定邮箱。"); renderAuth(); }));
    $("#auth-send-code")?.addEventListener("click", requestAuthCode);
    $("#auth-form")?.addEventListener("submit", submitAuth);
    $("#profile-logout")?.addEventListener("click", logoutAuth);
    $("#password-change-form")?.addEventListener("submit", changeAccountPassword);
    $$('[data-route]').forEach(button => button.addEventListener("click", () => routeTo(button.dataset.route)));
    $$('[data-route-jump]').forEach(button => button.addEventListener("click", () => routeTo(button.dataset.routeJump)));
    $$('[data-open-settings]').forEach(button => button.addEventListener("click", openSettings));
    $("#close-settings").addEventListener("click", closeSettings); $("#drawer-backdrop").addEventListener("click", closeSettings);
    window.addEventListener("popstate", () => {
      if (!$("#settings-drawer")?.classList.contains("open")) return;
      settingsHistoryActive = false;
      closeSettings({ fromHistory:true });
    });
    const settingsDrawer = $("#settings-drawer");
    let settingsSwipeStart = null;
    settingsDrawer?.addEventListener("touchstart", event => {
      const touch = event.touches[0];
      settingsSwipeStart = touch ? { x:touch.clientX, y:touch.clientY, at:Date.now() } : null;
    }, { passive:true });
    settingsDrawer?.addEventListener("touchend", event => {
      if (!settingsSwipeStart) return;
      const touch = event.changedTouches[0];
      const dx = touch ? touch.clientX - settingsSwipeStart.x : 0;
      const dy = touch ? touch.clientY - settingsSwipeStart.y : 0;
      const elapsed = Date.now() - settingsSwipeStart.at;
      settingsSwipeStart = null;
      if (dx < -64 && Math.abs(dx) > Math.abs(dy) * 1.25 && elapsed < 900) closeSettings();
    }, { passive:true });
    settingsDrawer?.addEventListener("touchcancel", () => { settingsSwipeStart = null; }, { passive:true });
    $("#controller-request-form")?.addEventListener("submit", submitControllerRequest);
    $("#controller-header-configs")?.addEventListener("click", event => { const button = event.target.closest?.("[data-download-controller-header]"); if (!button || !state.controller.data) return; const device = (state.controller.data.devices || []).find(item => item.device_id === button.dataset.downloadControllerHeader); downloadControllerHeader(device); });
    $$('[data-connection-mode]').forEach(button => button.addEventListener("click", () => selectConnectionMode(button.dataset.connectionMode)));
    $("#apply-connection").addEventListener("click", applyConnection);
    $("#simulation-toggle")?.addEventListener("click",()=>setSimulationEnabled(!state.simulationEnabled));
    $("#onstep-bluetooth-status")?.addEventListener("click",requestBluetoothToggle);
    bindVerticalNumberDrag($("#camera-hours"));bindVerticalNumberDrag($("#camera-minutes"));
    $$('[data-toggle]').forEach(button => button.addEventListener("click", () => toggleMain(button.dataset.toggle)));
    $$('[data-mppt-toggle]').forEach(button => button.addEventListener("click", () => toggleMppt(button.dataset.mpptToggle)));
    $$('[data-mppt-fan-mode]').forEach(button=>button.addEventListener("click",()=>{const automatic=button.dataset.mpptFanMode==="auto";sendCommand("mppt-001",{enable_fan:automatic},automatic?"风扇切换为自动模式":"风扇切换为手动模式")}));
    $("#apply-mppt-fan-temp")?.addEventListener("click",()=>{const value=Number($("#set-fan-temp")?.value);if(!Number.isFinite(value)||value<20||value>80){toast("温度阈值无效","请输入 20 至 80°C。","error");return}sendCommand("mppt-001",{temperature_fan:value},`设置风扇阈值 ${Math.round(value)}°C`)});
    $$('[data-flat-toggle]').forEach(button => button.addEventListener("click", () => toggleFlat(button.dataset.flatToggle)));
    $$('[data-roof]').forEach(button => button.addEventListener("click", () => roofCommand(button.dataset.roof)));
    $$('[data-onstep]').forEach(button => button.addEventListener("click", () => sendCommand("esp32-001", {command:"onstep",action:Number(button.dataset.onstep)}, `OnStep 操作 ${button.textContent.trim()}`)));
    $$('[data-command-debug]').forEach(button => button.addEventListener("click", () => sendCommand(button.dataset.commandDebug, {debug:true}, "请求诊断")));
    bindNumberSteppers();
    $("#save-power-settings").addEventListener("click", savePowerSettings);
    $("#toggle-panel").addEventListener("click", togglePanel);
    $("#confirm-cancel").addEventListener("click", closeConfirm); $("#confirm-accept").addEventListener("click", () => state.pendingConfirm?.());
    $("#confirm-modal").addEventListener("click", event => { if(event.target.id==="confirm-modal") closeConfirm(); });
    const sliders=[
      ["#brightness","#brightness-value","brightness",v=>sendCommand("ef-001",{command:"brightness",value:v},"设置 LED 亮度")],
      ["#humidity-threshold","#humidity-threshold-value","humi_threshold",v=>sendCommand("ef-001",{command:"humi_threshold",value:v},"设置湿度阈值")],
      ["#heater-power","#heater-power-value","heater_power",v=>sendCommand("ef-001",{command:"heater_power",value:v},"设置加热功率")]
    ];
    sliders.forEach(([inputSel,valueSel,_key,send])=>{const input=$(inputSel);input.addEventListener("input",()=>setText(valueSel,`${input.value}% · 待确认`));input.addEventListener("change",()=>{send(Number(input.value));render()})});
    const servoLimit = $("#servo-limit-range");
    servoLimit?.addEventListener("input",()=>{const value=clamp(servoLimit.value,0,300);setText("#servo-limit-value",`${value}° · 待确认`);$("#angle-limit-control")?.style.setProperty("--limit-progress",`${value/3}%`)});
    servoLimit?.addEventListener("change",()=>{sendCommand("ef-001",{command:"angle",value:Number(servoLimit.value)},"设置平场板限位角度");render()});
    $$('[data-camera-duration]').forEach(button=>button.addEventListener("click",()=>setCameraDuration(Number(button.dataset.cameraDuration))));
    $("#apply-camera-duration")?.addEventListener("click",()=>setCameraDuration(Number($("#camera-hours").value)*60+Number($("#camera-minutes").value)));
    $$('[data-device-mode]').forEach(button=>button.addEventListener("click",()=>setDeviceMode(button.dataset.deviceMode,button.dataset.modeValue)));
    const fanThreshold=$("#fan-threshold");
    fanThreshold?.addEventListener("input",()=>setText("#fan-threshold-value",`${fanThreshold.value}°C · 待确认`));
    fanThreshold?.addEventListener("change",()=>{sendCommand("esp32-001",{command:"fan_threshold",value:Number(fanThreshold.value)},"设置风扇自动开启温度");renderEnvironmentControls()});
    $$('[data-env-live-range]').forEach(button=>button.addEventListener("click",()=>{$$('[data-env-live-range]').forEach(item=>item.classList.remove("active"));button.classList.add("active");state.environmentLiveRange=Number(button.dataset.envLiveRange);drawEnvironmentLiveChart()}));
    $$('[data-env-y-range]').forEach(button=>button.addEventListener("click",()=>{$$('[data-env-y-range]').forEach(item=>item.classList.remove("active"));button.classList.add("active");state.environmentYRange=button.dataset.envYRange;drawEnvironmentLiveChart()}));
    $$('[data-env-forecast-range]').forEach(button=>button.addEventListener("click",()=>{state.environmentForecastRange=Number(button.dataset.envForecastRange);drawEnvironmentLiveChart()}));
    $$('[data-env-forecast-y-range]').forEach(button=>button.addEventListener("click",()=>{state.environmentForecastYRange=button.dataset.envForecastYRange;drawEnvironmentLiveChart()}));
    $$('[data-forecast-range]').forEach(button=>button.addEventListener("click",()=>{state.forecastRange=Number(button.dataset.forecastRange);renderForecast()}));
    $$('[data-forecast-y-range]').forEach(button=>button.addEventListener("click",()=>{state.forecastYRange=button.dataset.forecastYRange;$$('[data-forecast-y-range]').forEach(item=>item.classList.toggle("active",item===button));drawForecastCharts()}));
    $$('[data-seven-timer-range]').forEach(button=>button.addEventListener("click",()=>{state.sevenTimerRange=Number(button.dataset.sevenTimerRange);$$('[data-seven-timer-range]').forEach(item=>item.classList.toggle("active",item===button));drawAstronomyChart()}));
    $("#seeing-source-trigger")?.addEventListener("click",()=>{
      const picker=$("#seeing-source-picker"),trigger=$("#seeing-source-trigger"),menu=$("#seeing-source-menu");
      const open=menu?.hidden !== false;
      if(menu)menu.hidden=!open;
      picker?.classList.toggle("open",open);
      trigger?.setAttribute("aria-expanded",String(open));
    });
    $("#seeing-source-menu")?.addEventListener("click",event=>{const option=event.target.closest?.("[data-seeing-source]");if(option)setSeeingSource(option.dataset.seeingSource)});
    document.addEventListener("pointerdown",event=>{const picker=$("#seeing-source-picker");if(picker&&!picker.contains(event.target))closeSeeingSourceMenu()});
    $("#weather-location-submit")?.addEventListener("click",()=>searchWeatherLocations($("#weather-location-search").value));
    $("#weather-location-current")?.addEventListener("click",useCurrentWeatherLocation);
    const weatherLocationInput = $("#weather-location-search");
    weatherLocationInput?.addEventListener("input",event=>{
      clearTimeout(weatherSearchTimer);
      const value=event.currentTarget.value;
      if(!value.trim()){const results=$("#weather-location-results");if(results)results.hidden=true;event.currentTarget.setAttribute("aria-expanded","false");return;}
      weatherSearchTimer=setTimeout(()=>searchWeatherLocations(value),320);
    });
    weatherLocationInput?.addEventListener("keydown",event=>{
      if(event.key==="Enter"){event.preventDefault();clearTimeout(weatherSearchTimer);searchWeatherLocations(event.currentTarget.value)}
      if(event.key==="Escape"){const results=$("#weather-location-results");if(results)results.hidden=true;event.currentTarget.setAttribute("aria-expanded","false")}
    });
    $("#weather-location-results")?.addEventListener("click",event=>{const option=event.target.closest?.("[data-weather-location]");if(!option)return;const results=$("#weather-location-results");const location=results._locations?.[Number(option.dataset.weatherLocation)];if(location){results.hidden=true;weatherLocationInput?.setAttribute("aria-expanded","false");weatherLocationInput.value=location.name;loadForecast(location)}});
    bindTerminalPickers();
    $$('[data-clear-terminal]').forEach(button=>button.addEventListener("click",()=>{state.terminal=[];renderTerminals()}));
    $$('[data-terminal-form]').forEach(form=>form.addEventListener("submit",event=>{event.preventDefault();const card=form.closest('[data-terminal-card]');const input=$('[data-terminal-input]',card);const device=$('[data-terminal-device]',card)?.value||"esp32-001";const value=input.value.trim();if(!value)return;sendCommand(device,{command:"terminal",value},`终端: ${value}`);input.value=""}));
    $$('[data-terminal-debug]').forEach(button=>button.addEventListener("click",()=>{const card=button.closest('[data-terminal-card]');const device=$('[data-terminal-device]',card)?.value||"esp32-001";sendCommand(device,{debug:true},"打印调试信息");}));
    $$('[data-range]').forEach(button=>button.addEventListener("click",()=>{$$('[data-range]').forEach(b=>b.classList.remove("active"));button.classList.add("active");state.historyRange=Number(button.dataset.range);drawCharts()}));
    $$('[data-device-history-range]').forEach(button=>button.addEventListener("click",()=>{$$('[data-device-history-range]').forEach(item=>item.classList.remove("active"));button.classList.add("active");state.deviceHistory.range=Number(button.dataset.deviceHistoryRange);rebuildDeviceHistory();drawDeviceHistoryChart()}));
    $$('[data-power-y-range]').forEach(button=>button.addEventListener("click",()=>{$$('[data-power-y-range]').forEach(item=>item.classList.remove("active"));button.classList.add("active");state.powerYRange=button.dataset.powerYRange;drawCharts()}));
    $$('[data-series]').forEach(button=>button.addEventListener("click",()=>{button.classList.toggle("active");state.visibleSeries[button.dataset.series]=button.classList.contains("active");drawCharts()}));
    $("#export-data").addEventListener("click",exportCsv);
    $$('button[data-theme-color]').forEach(button => button.addEventListener("click", () => { state.themeColor = button.dataset.themeColor; applyPreferences(true); }));
    $$('button[data-color-mode]').forEach(button => button.addEventListener("click", () => { state.colorMode = button.dataset.colorMode; applyPreferences(true); }));
    $$('button[data-font-size]').forEach(button => button.addEventListener("click", () => { state.fontSize = button.dataset.fontSize; applyPreferences(true); }));
    $("#reset-preferences")?.addEventListener("click", () => { state.themeColor = "black"; state.colorMode = "light"; state.fontSize = "small"; applyPreferences(true); toast("偏好已重置", "已恢复黑色、亮色模式和小号字体。", "ok"); });
    window.addEventListener("hashchange",()=>routeTo(location.hash.replace("#", "")));
    window.addEventListener("resize",()=>requestAnimationFrame(()=>{renderHumiditySparkline();drawCharts()}));
    document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeSettings();closeConfirm();closeSeeingSourceMenu()}});
  }

  async function init() {
    routeTo("login");
    buildHistory();
    buildTerminals();
    const iconSource = window.lucide?.createIcons ? "lucide" : "missing";
    if (iconSource === "lucide") window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    const iconHealth = {
      icon_source:iconSource,
      unresolved_icons:$$('i[data-lucide]').length,
      rendered_icons:$$('svg.lucide').length,
      initial_route:state.route,
      login_visible:Boolean($("#page-login")?.classList.contains("active")),
      model_preloader_blocking:Boolean($("#app-preloader"))
    };
    window.__astraIconHealth = Object.freeze({ ...iconHealth });
    if (isNativeRuntime()) {
      nativeInvoke("report_frontend_health", { report:iconHealth })
        .catch(error => console.error("Desktop icon health check failed", error));
    }
    try { const savedLocation=JSON.parse(localStorage.getItem("astra.weather.location")); if(savedLocation?.latitude&&savedLocation?.longitude)state.forecast.location=savedLocation; } catch { /* optional local preference */ }
    const savedWeatherInput=$("#weather-location-search"); if(savedWeatherInput && state.forecast.location?.name) savedWeatherInput.value=state.forecast.location.name;
    applyPreferences();
    selectConnectionMode(); bindEvents(); initPwa(); await initNativeServerSettings(); await loadAuthSession();
    addLog("SYSTEM", "ASTRA 控制台已启动", "ok"); addLog("SYSTEM", "等待后端实时通道", "warn");
    setInterval(()=>{const now=new Date();setText("#clock",now.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false}));setText("#date",now.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit",weekday:"short"}));renderEnvironmentControls()},1000);
    setInterval(()=>{const now=Date.now();deviceIds.forEach(id=>{if(state.online[id]&&now-state.lastSeen[id]>deviceOnlineTimeout){state.online[id]=false;toast("设备掉线",`${id} 已超过 30 秒未上传遥测。`,"error","background")}});renderDeviceStatuses();updateConnectionUI()},5000);
    setInterval(()=>{if(state.auth.user)loadDeviceHistory()},60000);
    render(); renderForecast(); drawCharts(); requestAnimationFrame(() => requestAnimationFrame(drawCharts));
    if(state.forecast.location)loadForecast(state.forecast.location);
  }

  init();
})();

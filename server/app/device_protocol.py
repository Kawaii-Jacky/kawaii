"""Authoritative validation for ASTRA device telemetry and commands."""
from __future__ import annotations

import math
import re
from typing import Any


class ProtocolError(ValueError):
    pass


# Values outside these broad physical/sensor bounds are rejected before they
# reach the database or browser. Bounds are intentionally wider than normal
# operating ranges so real fault telemetry remains observable.
TELEMETRY_FIELDS: dict[str, dict[str, tuple[str, Any, Any]]] = {
    "esp32-001": {
        "dht_temperature": ("number", -50, 100),
        "dht_humidity": ("number", 0, 100),
        "utc_temperature": ("number", -100, 150),
        "output_voltage": ("number", 0, 100),
        "output_current": ("number", -100, 100),
        "power_output": ("number", -10000, 10000),
        "rain_analog": ("integer", 0, 4095),
        "rain_detected": ("boolean", None, None),
        "heater": ("boolean", None, None),
        "heater_mode": ("boolean", None, None),
        "fan": ("boolean", None, None),
        "fan_mode": ("boolean", None, None),
        "fan_threshold": ("number", 0, 100),
        "mosfet": ("boolean", None, None),
        "camera": ("boolean", None, None),
        "cameraDurationMinutes": ("integer", 1, 1439),
        "bluetooth": ("boolean", None, None),
        "roof": ("enum", {"unknown", "moving", "open", "closed"}, None),
        "roofPosition": ("number", 0, 100),
    },
    "mppt-001": {
        "power_input": ("number", 0, 10000),
        "battery_percent": ("number", 0, 100),
        "current_input": ("number", -100, 100),
        "buck_current": ("number", -100, 100),
        "buck_power": ("number", -10000, 10000),
        "voltage_input": ("number", 0, 250),
        "buck_voltage": ("number", 0, 100),
        "temperature": ("number", -50, 150),
        "pwm": ("integer", 0, 4095),
        "fan": ("boolean", None, None),
        "enable_fan": ("boolean", None, None),
        "mode": ("integer", 0, 1),
        "daily_energy": ("number", 0, 1000000),
        "total_energy": ("number", 0, 1000000000),
        "buck_efficiency": ("number", 0, 100),
        "days_running": ("number", 0, 100000),
        "voltage_battery_min": ("number", 8, 20),
        "voltage_battery_max": ("number", 12, 48),
        "current_charging": ("number", 0.1, 20),
        "temperature_fan": ("number", 20, 80),
    },
    "ef-001": {
        "humidity": ("number", 0, 100),
        "servo": ("boolean", None, None),
        "servoMoving": ("boolean", None, None),
        "led": ("boolean", None, None),
        "heater": ("boolean", None, None),
        "heater_mode": ("boolean", None, None),
        "angle": ("number", 0, 300),
        "maxAngle": ("number", 0, 300),
        "brightness": ("number", 0, 100),
        "humi_threshold": ("number", 0, 100),
        "heater_power": ("number", 0, 100),
    },
}

ENVELOPE_FIELDS = {"schema", "device", "ts", "seq"}
TERMINAL_SAFE = re.compile(
    r"^(?:S|SHOW|H|HELP|STATUS|[OEM]\s+(?:[0-9A-F]{2}:){5}[0-9A-F]{2})$",
    re.IGNORECASE,
)


def _number(value: Any, name: str, low: float, high: float, integer: bool = False) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
        raise ProtocolError(f"{name} must be a finite number")
    if integer and float(value) != int(value):
        raise ProtocolError(f"{name} must be an integer")
    result: int | float = int(value) if integer else float(value)
    if not low <= result <= high:
        raise ProtocolError(f"{name} must be between {low} and {high}")
    return result


def _boolean(value: Any, name: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and value in (0, 1):
        return bool(value)
    raise ProtocolError(f"{name} must be a boolean")


def validate_telemetry(device_id: str, body: dict[str, Any]) -> None:
    fields = TELEMETRY_FIELDS.get(device_id)
    if not fields:
        raise ProtocolError("unknown telemetry device")
    if body.get("device") != device_id:
        raise ProtocolError("telemetry device does not match topic")
    unknown = set(body) - ENVELOPE_FIELDS - set(fields)
    if unknown:
        raise ProtocolError(f"unsupported telemetry field: {sorted(unknown)[0]}")
    present = set(body) & set(fields)
    if not present:
        raise ProtocolError("telemetry contains no measurements")
    if "seq" in body:
        _number(body["seq"], "seq", 0, 9_007_199_254_740_991, integer=True)
    for name in present:
        kind, low, high = fields[name]
        value = body[name]
        if kind == "number":
            _number(value, name, low, high)
        elif kind == "integer":
            _number(value, name, low, high, integer=True)
        elif kind == "boolean":
            _boolean(value, name)
        elif kind == "enum" and value not in low:
            raise ProtocolError(f"{name} has an unsupported value")


def _terminal(args: dict[str, Any], *, mac_commands: bool) -> dict[str, Any]:
    value = args.get("value")
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= 80:
        raise ProtocolError("terminal value must contain 1-80 characters")
    value = value.strip()
    allowed = TERMINAL_SAFE.fullmatch(value) if mac_commands else value.upper() in {"HELP", "H", "STATUS", "S"}
    if not allowed:
        raise ProtocolError("terminal command is not allowed")
    return {"value": value}


def normalize_command(device_id: str, command: str, args: dict[str, Any]) -> dict[str, Any]:
    """Validate a command and return the exact firmware argument envelope."""
    command = command.strip().lower()
    if not command:
        raise ProtocolError("command is required")

    if device_id == "esp32-001":
        if command in {"heater", "fan", "camera", "bluetooth"}:
            return {"state": _boolean(args.get("state"), "state")}
        if command == "mosfet":
            return {"state": int(_boolean(args.get("state"), "state"))}
        if command in {"heater_mode", "fan_mode"}:
            enabled = args.get("enabled")
            if enabled is None and args.get("mode") in {"auto", "manual"}:
                enabled = args["mode"] == "auto"
            return {"enabled": _boolean(enabled, "enabled")}
        if command == "fan_threshold":
            return {"value": _number(args.get("value"), "value", 20, 80, integer=True)}
        if command == "camera_timer":
            return {"minutes": _number(args.get("minutes"), "minutes", 1, 1439, integer=True)}
        if command in {"motor_forward", "motor_reverse", "motor_stop", "debug"}:
            return {}
        if command == "onstep":
            return {"action": _number(args.get("action"), "action", 1, 6, integer=True)}
        if command == "terminal":
            return _terminal(args, mac_commands=True)

    if device_id == "mppt-001":
        if command in {"fan", "enable_fan"}:
            value = args.get("state", args.get("enabled", args.get("value")))
            return {"state": _boolean(value, "state")}
        if command == "mode":
            value = args.get("value", args.get("state", args.get("enabled")))
            return {"value": int(_boolean(value, "value"))}
        limits = {
            "voltage_battery_min": (8.0, 20.0),
            "voltage_battery_max": (12.0, 48.0),
            "current_charging": (0.1, 20.0),
            "temperature_fan": (20.0, 80.0),
        }
        if command in limits:
            low, high = limits[command]
            return {"value": _number(args.get("value"), "value", low, high)}
        if command == "settings":
            result = {key: _number(args.get(key), key, *limits[key]) for key in limits}
            if result["voltage_battery_max"] - result["voltage_battery_min"] < 0.5:
                raise ProtocolError("voltage_battery_max must be at least 0.5V above voltage_battery_min")
            return result
        if command == "debug":
            return {}
        if command == "terminal":
            return _terminal(args, mac_commands=False)

    if device_id == "ef-001":
        if command in {"heater"}:
            return {"state": _boolean(args.get("state"), "state")}
        if command == "heater_mode":
            return {"enabled": _boolean(args.get("enabled"), "enabled")}
        if command == "led":
            result = {"state": _boolean(args.get("state"), "state")}
            if "brightness" in args:
                result["brightness"] = _number(args["brightness"], "brightness", 0, 100, integer=True)
            return result
        limits = {"brightness": (0, 100), "humi_threshold": (0, 100), "heater_power": (0, 100), "angle": (0, 300)}
        if command in limits:
            low, high = limits[command]
            return {"value": _number(args.get("value"), "value", low, high, integer=True)}
        if command == "servo":
            result = {"state": _boolean(args.get("state"), "state")}
            if "angle" in args:
                result["angle"] = _number(args["angle"], "angle", 0, 300, integer=True)
            return result
        if command == "debug":
            return {}
        if command == "terminal":
            return _terminal(args, mac_commands=False)

    raise ProtocolError(f"unsupported command for {device_id}: {command}")

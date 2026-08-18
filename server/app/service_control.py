"""Minimal allow-listed Docker restart helper exposed only through a Unix socket."""
from __future__ import annotations

import http.client
import json
import os
import socket
import time
import urllib.parse
from pathlib import Path
from typing import Any

DOCKER_SOCKET = os.getenv("DOCKER_SOCKET", "/var/run/docker.sock")
CONTROL_SOCKET = Path(os.getenv("SERVICE_CONTROL_SOCKET", "/run/service-control/control.sock"))
COMPOSE_PROJECT = os.getenv("COMPOSE_PROJECT", "server")
DOCKER_API_VERSION = os.getenv("DOCKER_API_VERSION", "v1.44")
COOLDOWN_SECONDS = int(os.getenv("RESTART_COOLDOWN_SECONDS", "30"))
ALLOWED_SERVICES = {
    "postgres": "postgres",
    "mqtt": "mosquitto",
    "api": "api",
    "sms": "sms-gateway",
}
last_restart: dict[str, float] = {}


class UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self) -> None:
        super().__init__("localhost", timeout=20)

    def connect(self) -> None:
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect(DOCKER_SOCKET)


def docker_request(method: str, path: str) -> tuple[int, bytes]:
    connection = UnixHTTPConnection()
    try:
        connection.request(method, path, headers={"Host": "localhost"})
        response = connection.getresponse()
        return response.status, response.read()
    finally:
        connection.close()


def find_container(service: str) -> dict[str, Any]:
    filters = json.dumps({
        "label": [
            f"com.docker.compose.project={COMPOSE_PROJECT}",
            f"com.docker.compose.service={service}",
        ]
    })
    path = f"/{DOCKER_API_VERSION}/containers/json?all=1&filters=" + urllib.parse.quote(filters)
    status, body = docker_request("GET", path)
    if status != 200:
        raise RuntimeError(f"Docker list failed with HTTP {status}")
    matches = json.loads(body)
    if len(matches) != 1:
        raise RuntimeError(f"Expected one compose container, found {len(matches)}")
    return matches[0]


def restart_service(public_name: str, configuration_change: bool = False) -> dict[str, Any]:
    compose_service = ALLOWED_SERVICES.get(public_name)
    if not compose_service:
        raise ValueError("Service is not restartable")
    now = time.monotonic()
    remaining = COOLDOWN_SECONDS - (now - last_restart.get(public_name, 0))
    if remaining > 0 and not (configuration_change and public_name == "api"):
        raise RuntimeError(f"Restart cooldown active for {int(remaining) + 1}s")
    container = find_container(compose_service)
    container_id = container["Id"]
    status, body = docker_request("POST", f"/{DOCKER_API_VERSION}/containers/{container_id}/restart?t=15")
    if status != 204:
        message = body.decode("utf-8", "replace")[:240]
        raise RuntimeError(f"Docker restart failed with HTTP {status}: {message}")
    last_restart[public_name] = time.monotonic()
    return {"ok": True, "service": public_name, "container": container_id[:12]}


def signal_service(public_name: str, signal_name: str) -> dict[str, Any]:
    compose_service = ALLOWED_SERVICES.get(public_name)
    if not compose_service or signal_name not in {"SIGHUP"}:
        raise ValueError("Service signal is not allowed")
    container = find_container(compose_service)
    container_id = container["Id"]
    path = f"/{DOCKER_API_VERSION}/containers/{container_id}/kill?signal=" + urllib.parse.quote(signal_name)
    status, body = docker_request("POST", path)
    if status != 204:
        message = body.decode("utf-8", "replace")[:240]
        raise RuntimeError(f"Docker signal failed with HTTP {status}: {message}")
    return {"ok": True, "service": public_name, "signal": signal_name, "container": container_id[:12]}


def handle(request: dict[str, Any]) -> dict[str, Any]:
    action = request.get("action")
    if action == "health":
        status, _body = docker_request("GET", f"/{DOCKER_API_VERSION}/version")
        return {"ok": status == 200, "allowlist": sorted(ALLOWED_SERVICES)}
    if action == "restart":
        return restart_service(
            str(request.get("service", "")),
            configuration_change=request.get("reason") == "configuration-change",
        )
    if action == "signal":
        return signal_service(str(request.get("service", "")), str(request.get("signal", "")))
    raise ValueError("Unsupported action")


def serve() -> None:
    CONTROL_SOCKET.parent.mkdir(parents=True, exist_ok=True)
    if CONTROL_SOCKET.exists() or CONTROL_SOCKET.is_socket():
        CONTROL_SOCKET.unlink()
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    server.bind(str(CONTROL_SOCKET))
    os.chmod(CONTROL_SOCKET, 0o660)
    server.listen(8)
    while True:
        connection, _address = server.accept()
        with connection:
            connection.settimeout(30)
            try:
                payload = b""
                while b"\n" not in payload and len(payload) < 8192:
                    chunk = connection.recv(2048)
                    if not chunk:
                        break
                    payload += chunk
                request = json.loads(payload.split(b"\n", 1)[0])
                response = handle(request)
            except Exception as exc:
                response = {"ok": False, "error": str(exc)[:300]}
            connection.sendall(json.dumps(response, ensure_ascii=False).encode("utf-8") + b"\n")


if __name__ == "__main__":
    serve()

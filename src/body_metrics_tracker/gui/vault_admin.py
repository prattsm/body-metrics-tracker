from __future__ import annotations

import json
import os
import secrets
import socket
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from PySide6.QtCore import QStandardPaths, QTimer
from PySide6.QtWidgets import (
    QApplication,
    QFileDialog,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QVBoxLayout,
    QWidget,
)

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from body_metrics_tracker.sync.client import check_health, create_invite

INVITE_FILE_VERSION = 1


@dataclass
class VaultAdminConfig:
    storage_path: Path
    master_key_b64: str
    cert_path: Path
    key_path: Path
    admin_token: str
    host: str
    port: int

    def to_dict(self) -> dict[str, str | int]:
        return {
            "storage_path": str(self.storage_path),
            "master_key_b64": self.master_key_b64,
            "cert_path": str(self.cert_path),
            "key_path": str(self.key_path),
            "admin_token": self.admin_token,
            "host": self.host,
            "port": self.port,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, str | int]) -> "VaultAdminConfig":
        return cls(
            storage_path=Path(str(payload["storage_path"])),
            master_key_b64=str(payload["master_key_b64"]),
            cert_path=Path(str(payload["cert_path"])),
            key_path=Path(str(payload["key_path"])),
            admin_token=str(payload["admin_token"]),
            host=str(payload.get("host", "0.0.0.0")),
            port=int(payload.get("port", 8443)),
        )


class VaultServerController:
    def __init__(self) -> None:
        self._process: subprocess.Popen | None = None

    def start(self, config: VaultAdminConfig) -> None:
        if self.is_running():
            return
        env = os.environ.copy()
        env["VAULT_STORAGE_PATH"] = str(config.storage_path)
        env["VAULT_MASTER_KEY"] = config.master_key_b64
        env["VAULT_ADMIN_TOKEN"] = config.admin_token
        env["VAULT_TLS_CERT"] = str(config.cert_path)
        env["VAULT_TLS_KEY"] = str(config.key_path)
        env["VAULT_HOST"] = config.host
        env["VAULT_PORT"] = str(config.port)
        self._process = subprocess.Popen(
            [sys.executable, "-m", "body_metrics_tracker.vault"],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    def stop(self) -> None:
        if not self._process:
            return
        if self._process.poll() is None:
            self._process.terminate()
            try:
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._process.kill()
        self._process = None

    def is_running(self) -> bool:
        return self._process is not None and self._process.poll() is None


class VaultAdminWidget(QWidget):
    def __init__(self) -> None:
        super().__init__()
        self.controller = VaultServerController()
        self.config = ensure_admin_config()
        self._build_ui()
        self._load_config()
        self._status_timer = QTimer(self)
        self._status_timer.timeout.connect(self._refresh_status)
        self._status_timer.start(3000)
        self._refresh_status()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        header = QLabel("Vault (Admin)")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(header)

        server_group = QGroupBox("Server")
        server_form = QFormLayout()

        self.host_input = QLineEdit()
        self.host_input.setText(self.config.host)
        self.port_input = QSpinBox()
        self.port_input.setRange(1024, 65535)
        self.port_input.setValue(self.config.port)

        self.url_display = QLineEdit()
        self.url_display.setReadOnly(True)
        self.copy_url_button = QPushButton("Copy")
        self.copy_url_button.clicked.connect(self._copy_url)
        url_row = QHBoxLayout()
        url_row.addWidget(self.url_display, 1)
        url_row.addWidget(self.copy_url_button)
        url_container = QWidget()
        url_container.setLayout(url_row)

        self.cert_display = QLineEdit()
        self.cert_display.setReadOnly(True)
        self.copy_cert_button = QPushButton("Copy")
        self.copy_cert_button.clicked.connect(self._copy_cert_path)
        self.export_cert_button = QPushButton("Export")
        self.export_cert_button.clicked.connect(self._export_cert)
        cert_row = QHBoxLayout()
        cert_row.addWidget(self.cert_display, 1)
        cert_row.addWidget(self.copy_cert_button)
        cert_row.addWidget(self.export_cert_button)
        cert_container = QWidget()
        cert_container.setLayout(cert_row)

        self.start_button = QPushButton("Start Vault")
        self.start_button.clicked.connect(self._on_start)
        self.stop_button = QPushButton("Stop Vault")
        self.stop_button.clicked.connect(self._on_stop)
        button_row = QHBoxLayout()
        button_row.addWidget(self.start_button)
        button_row.addWidget(self.stop_button)
        button_container = QWidget()
        button_container.setLayout(button_row)

        self.status_label = QLabel("Status: stopped")
        self.status_label.setStyleSheet("color: #9aa4af;")

        server_form.addRow("Host", self.host_input)
        server_form.addRow("Port", self.port_input)
        server_form.addRow("Vault URL", url_container)
        server_form.addRow("Certificate", cert_container)
        server_form.addRow("", button_container)
        server_form.addRow("", self.status_label)
        server_group.setLayout(server_form)
        layout.addWidget(server_group)

        invite_group = QGroupBox("Invite")
        invite_form = QFormLayout()
        self.invite_display = QLineEdit()
        self.invite_display.setReadOnly(True)
        self.invite_button = QPushButton("Generate Invite")
        self.invite_button.clicked.connect(self._on_generate_invite)
        self.copy_invite_button = QPushButton("Copy")
        self.copy_invite_button.clicked.connect(self._copy_invite)
        self.export_invite_button = QPushButton("Export Invite File")
        self.export_invite_button.clicked.connect(self._on_export_invite_file)
        invite_row = QHBoxLayout()
        invite_row.addWidget(self.invite_display, 1)
        invite_row.addWidget(self.invite_button)
        invite_row.addWidget(self.copy_invite_button)
        invite_row.addWidget(self.export_invite_button)
        invite_container = QWidget()
        invite_container.setLayout(invite_row)
        invite_form.addRow("Invite token", invite_container)
        invite_group.setLayout(invite_form)
        layout.addWidget(invite_group)

        info = QLabel(
            "Admin only. Start the vault here, then share the invite file with friends."
        )
        info.setWordWrap(True)
        info.setStyleSheet("color: #9aa4af;")
        layout.addWidget(info)
        layout.addStretch(1)

    def _load_config(self) -> None:
        self.cert_display.setText(str(self.config.cert_path))
        self._update_url_display()

    def _update_url_display(self) -> None:
        host = self.host_input.text().strip() or "0.0.0.0"
        port = self.port_input.value()
        url_host = _resolve_public_host(host)
        self.url_display.setText(f"https://{url_host}:{port}")

    def _on_start(self) -> None:
        self.config = ensure_admin_config()
        self.config.host = self.host_input.text().strip() or "0.0.0.0"
        self.config.port = int(self.port_input.value())
        save_admin_config(self.config)
        self._update_url_display()

        if not self.config.cert_path.exists() or not self.config.key_path.exists():
            generate_self_signed_cert(self.config.cert_path, self.config.key_path, _local_hostnames())
            self.cert_display.setText(str(self.config.cert_path))

        self.controller.start(self.config)
        self._refresh_status()

    def _on_stop(self) -> None:
        self.controller.stop()
        self._refresh_status()

    def _refresh_status(self) -> None:
        if self.controller.is_running():
            try:
                response = check_health(
                    self.url_display.text(),
                    vault_cert_path=str(self.config.cert_path),
                    allow_insecure_http=False,
                )
                status = response.get("status", "unknown")
                self.status_label.setText(f"Status: running ({status})")
            except Exception:
                self.status_label.setText("Status: starting...")
        else:
            self.status_label.setText("Status: stopped")

    def _copy_url(self) -> None:
        QApplication.clipboard().setText(self.url_display.text())

    def _copy_cert_path(self) -> None:
        QApplication.clipboard().setText(self.cert_display.text())

    def _export_cert(self) -> None:
        target, _ = QFileDialog.getSaveFileName(
            self,
            "Export Certificate",
            "vault.crt",
            "Certificate Files (*.crt *.pem);;All Files (*)",
        )
        if not target:
            return
        try:
            Path(target).write_bytes(self.config.cert_path.read_bytes())
        except OSError as exc:
            QMessageBox.warning(self, "Export Failed", str(exc))

    def _on_generate_invite(self) -> None:
        self._request_invite_token()

    def _on_export_invite_file(self) -> None:
        self._update_url_display()
        token = self.invite_display.text().strip()
        expires_at = None
        if not token:
            token, expires_at = self._request_invite_token()
        if not token:
            return
        target, _ = QFileDialog.getSaveFileName(
            self,
            "Export Vault Invite",
            "vault_invite.json",
            "Invite Files (*.json);;All Files (*)",
        )
        if not target:
            return
        try:
            payload = self._build_invite_payload(token, expires_at)
            Path(target).write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except OSError as exc:
            QMessageBox.warning(self, "Export Failed", str(exc))
            return
        QMessageBox.information(self, "Invite Ready", "Share the invite file with your friend.")

    def _request_invite_token(self) -> tuple[str | None, str | None]:
        if not self.controller.is_running():
            QMessageBox.warning(self, "Vault not running", "Start the vault server first.")
            return None, None
        try:
            response = create_invite(
                self.url_display.text(),
                admin_token=self.config.admin_token,
                vault_cert_path=str(self.config.cert_path),
                allow_insecure_http=False,
            )
        except Exception as exc:
            QMessageBox.warning(self, "Invite Failed", str(exc))
            return None, None
        token = response.get("invite_token")
        if token:
            self.invite_display.setText(token)
        return token, response.get("expires_at")

    def _build_invite_payload(self, token: str, expires_at: str | None) -> dict[str, str | int | None]:
        cert_pem = self.config.cert_path.read_text(encoding="utf-8")
        return {
            "version": INVITE_FILE_VERSION,
            "vault_url": self.url_display.text().strip(),
            "invite_token": token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "vault_cert_pem": cert_pem,
        }

    def _copy_invite(self) -> None:
        QApplication.clipboard().setText(self.invite_display.text())

    def stop_server(self) -> None:
        self.controller.stop()

    def is_running(self) -> bool:
        return self.controller.is_running()



def _app_data_dir() -> Path:
    location = QStandardPaths.writableLocation(QStandardPaths.AppDataLocation)
    if not location:
        return Path.home() / ".body_metrics_tracker"
    return Path(location)


def _config_path() -> Path:
    base = _app_data_dir()
    base.mkdir(parents=True, exist_ok=True)
    return base / "vault_admin.json"


def should_show_admin_tab() -> bool:
    flag = os.getenv("BMT_ENABLE_VAULT_ADMIN", "").strip().lower()
    if flag in {"1", "true", "yes", "on"}:
        return True
    return _config_path().exists()


def ensure_admin_config() -> VaultAdminConfig:
    config = load_admin_config()
    if config:
        if not config.storage_path.parent.exists():
            config.storage_path.parent.mkdir(parents=True, exist_ok=True)
        return config
    base_dir = _app_data_dir() / "vault"
    base_dir.mkdir(parents=True, exist_ok=True)
    storage_path = base_dir / "vault.db"
    cert_path = base_dir / "vault.crt"
    key_path = base_dir / "vault.key"
    master_key = secrets.token_bytes(32)
    admin_token = secrets.token_urlsafe(32)
    config = VaultAdminConfig(
        storage_path=storage_path,
        master_key_b64=master_key.hex(),
        cert_path=cert_path,
        key_path=key_path,
        admin_token=admin_token,
        host="0.0.0.0",
        port=8443,
    )
    generate_self_signed_cert(cert_path, key_path, _local_hostnames())
    save_admin_config(config)
    return config


def load_admin_config() -> Optional[VaultAdminConfig]:
    path = _config_path()
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return VaultAdminConfig.from_dict(payload)
    except Exception:
        return None


def save_admin_config(config: VaultAdminConfig) -> None:
    path = _config_path()
    path.write_text(json.dumps(config.to_dict(), indent=2), encoding="utf-8")


def _resolve_public_host(host: str) -> str:
    if host in {"0.0.0.0", "", "::"}:
        return _local_ip() or "127.0.0.1"
    return host


def _local_ip() -> str | None:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except Exception:
        return None


def _local_hostnames() -> list[str]:
    names = ["localhost", "127.0.0.1"]
    ip = _local_ip()
    if ip:
        names.append(ip)
    return names


def generate_self_signed_cert(cert_path: Path, key_path: Path, hostnames: list[str]) -> None:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Body Metrics Vault")])
    alt_names = []
    for name in hostnames:
        if _looks_like_ip(name):
            alt_names.append(x509.IPAddress(_parse_ip(name)))
        else:
            alt_names.append(x509.DNSName(name))
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.utcnow())
        .not_valid_after(datetime.utcnow() + timedelta(days=3650))
        .add_extension(x509.SubjectAlternativeName(alt_names), critical=False)
        .sign(key, hashes.SHA256())
    )

    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    key_path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )


def _looks_like_ip(value: str) -> bool:
    return value.count(".") == 3


def _parse_ip(value: str):
    try:
        import ipaddress

        return ipaddress.ip_address(value)
    except Exception:
        return ipaddress.ip_address("127.0.0.1")


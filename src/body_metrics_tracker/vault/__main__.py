from __future__ import annotations

import os

import uvicorn


def main() -> None:
    host = os.getenv("VAULT_HOST", "0.0.0.0")
    port = int(os.getenv("VAULT_PORT", "8000"))
    certfile = os.getenv("VAULT_TLS_CERT")
    keyfile = os.getenv("VAULT_TLS_KEY")
    uvicorn.run(
        "body_metrics_tracker.vault.server:app",
        host=host,
        port=port,
        reload=False,
        ssl_certfile=certfile,
        ssl_keyfile=keyfile,
    )


if __name__ == "__main__":
    main()

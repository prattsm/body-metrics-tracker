from __future__ import annotations

import os


RELAY_URL = "https://body-metrics-relay.bodymetricstracker.workers.dev"
DEFAULT_RELAY_URL = os.getenv("BMT_RELAY_URL", RELAY_URL).strip()

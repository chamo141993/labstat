#!/usr/bin/env python3

import json
import subprocess
import time

import requests

OPEN5GS_SERVICES = [
    "open5gs-amfd",
    "open5gs-smfd",
    "open5gs-upfd",
]
POST_URL = "https://your-render-app.onrender.com/update-status"
API_KEY = "YOUR_API_KEY"
CHECK_INTERVAL_SECONDS = 5
REQUEST_TIMEOUT_SECONDS = 5


def check_core_status():
    active_services = []
    inactive_services = []

    for service in OPEN5GS_SERVICES:
        try:
            result = subprocess.run(
                ["systemctl", "is-active", service],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.stdout.strip() == "active":
                active_services.append(service)
            else:
                inactive_services.append(service)
        except FileNotFoundError as exc:
            print(f"[core] systemctl is unavailable: {exc}")
            return "down"
        except Exception as exc:
            print(f"[core] failed to check {service}: {exc}")
            inactive_services.append(service)

    if inactive_services:
        print(f"[core] inactive services: {', '.join(inactive_services)}")

    if len(active_services) == len(OPEN5GS_SERVICES):
        return "up"
    if active_services:
        return "partial"
    return "down"


def build_payload():
    return {
        "node": "core",
        "status": {
            "core": check_core_status(),
        },
    }


def post_status(payload):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            POST_URL,
            headers=headers,
            data=json.dumps(payload),
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        print(f"[post] status={response.status_code} payload={json.dumps(payload)}")
    except requests.RequestException as exc:
        print(f"[post] failed to push telemetry: {exc}")


def main():
    while True:
        try:
            payload = build_payload()
            print(f"[check] {json.dumps(payload)}")
            post_status(payload)
        except Exception as exc:
            print(f"[loop] unexpected error: {exc}")
        time.sleep(CHECK_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()

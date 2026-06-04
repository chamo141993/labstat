#!/usr/bin/env python3

import json
import re
import subprocess
import time

import requests

OPEN5GS_SERVICES = [
    "open5gs-amfd",
    "open5gs-smfd",
    "open5gs-upfd",
]
POST_URL = "https://labstat.onrender.com/update-status"
API_KEY = "f75e319669caed3829402ddcd7995507"
CHECK_INTERVAL_SECONDS = 5
REQUEST_TIMEOUT_SECONDS = 5
AMF_LOG_PATTERN = re.compile(r"Number of gNB-UEs is now (\d+)")
AMF_LOG_LINES = 300


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


def parse_ue_count(log_text):
    latest_count = None

    for line in log_text.splitlines():
        match = AMF_LOG_PATTERN.search(line)
        if match:
            latest_count = int(match.group(1))

    return latest_count


def read_amf_logs():
    commands = [
        ["journalctl", "-u", "open5gs-amfd", "--no-pager", "-n", str(AMF_LOG_LINES)],
        ["tail", "-n", str(AMF_LOG_LINES), "/var/log/open5gs/amf.log"],
    ]

    for command in commands:
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout
            if result.stderr.strip():
                print(f"[ue] {' '.join(command)} failed: {result.stderr.strip()}")
        except FileNotFoundError as exc:
            print(f"[ue] log command unavailable: {exc}")
        except Exception as exc:
            print(f"[ue] failed to read AMF logs with {' '.join(command)}: {exc}")

    return ""


def check_ue_count():
    try:
        log_text = read_amf_logs()
        ue_count = parse_ue_count(log_text)
        if ue_count is None:
            print('[ue] no "Number of gNB-UEs is now X" message found in recent AMF logs')
        return ue_count
    except Exception as exc:
        print(f"[ue] failed to parse AMF UE count: {exc}")
    return None


def build_payload():
    return {
        "node": "core",
        "status": {
            "core": check_core_status(),
            "ue_count": check_ue_count(),
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
        response.raise_for_status()
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

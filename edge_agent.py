#!/usr/bin/env python3

import json
import subprocess
import time

import requests

GNB_COMMAND_MATCH = "gnb -c gnb_rf_b200_tdd_n78_20mhz.yml"
RIC_CONTAINERS = {"e2term", "e2mgr", "rtmgr"}
POST_URL = "https://labstat.onrender.com"
API_KEY = "F75E319669CAED3829402DDCD7995507"
CHECK_INTERVAL_SECONDS = 5
REQUEST_TIMEOUT_SECONDS = 5


def check_ocudu_status():
    try:
        result = subprocess.run(
            ["pgrep", "-f", GNB_COMMAND_MATCH],
            capture_output=True,
            text=True,
            check=False,
        )
        return "up" if result.returncode == 0 and result.stdout.strip() else "down"
    except FileNotFoundError as exc:
        print(f"[ocudu] pgrep is unavailable: {exc}")
    except Exception as exc:
        print(f"[ocudu] failed to check gNB process: {exc}")
    return "down"


def check_ric_status():
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            check=True,
        )
        running_containers = {
            line.strip() for line in result.stdout.splitlines() if line.strip()
        }
        missing = sorted(RIC_CONTAINERS - running_containers)
        if missing:
            print(f"[ric] missing containers: {', '.join(missing)}")
            return "down"
        return "up"
    except FileNotFoundError as exc:
        print(f"[ric] docker is unavailable: {exc}")
    except subprocess.CalledProcessError as exc:
        print(f"[ric] docker ps failed: {exc}")
    except Exception as exc:
        print(f"[ric] failed to check RIC containers: {exc}")
    return "down"


def build_payload():
    return {
        "node": "ran_ric",
        "status": {
            "ocudu": check_ocudu_status(),
            "ric": check_ric_status(),
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

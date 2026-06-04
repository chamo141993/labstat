# 5G Lab Monitoring Dashboard

A secure, real-time monitoring project for a physical 5G O-RAN lab.

## Project Context

The goal is to show the health of a live physical 5G Lab **without exposing the lab to inbound internet traffic**.

## Physical Lab Architecture

The lab consists of two Ubuntu laptops connected through an Ethernet switch:

- **Laptop 1 — RAN & RIC**
  - Runs the SRS-based monolithic OCUDU / gNB
  - Runs the O-RAN SC Near-RT RIC in Docker
- **Laptop 2 — Core**
  - Runs the Open5GS core

## Solution Architecture: Decoupled Telemetry Bridge

The system is designed as a secure 3-part architecture built around outbound-only telemetry.

### 1) Edge Agents (inside the lab)
Lightweight Python or Bash scripts run on the Ubuntu hosts and periodically check component health.

Examples:
- `systemctl is-active open5gs-amfd` on the Core host
- `docker ps` on the RAN/RIC host
- `pgrep -f "gnb -c gnb_rf_b200_tdd_n78_20mhz.yml"` for the SRS gNB process

These agents:
- collect local status every few seconds
- build a JSON payload
- send the data with a secure, outbound-only HTTP `POST` request to the cloud backend

### 2) Cloud Backend (Render / Node.js)
A lightweight containerized Node.js/Express API receives lab telemetry and republishes the latest known state.

Responsibilities:
- secured `POST /update-status` endpoint for agent updates
- public `GET /network-status` endpoint for dashboard reads
- container deployment using a distroless production image

### 3) Public Dashboard (Netlify / React)
A static frontend polls the cloud backend and shows live status for:
- Core
- RAN
- RIC
- connected UE count from Open5GS AMF logs

The presentation is simple green/red health cards plus a UE count metric suitable for public viewing.

## Security Goals

This project is intentionally designed around secure systems administration principles:

- **No inbound exposure of the physical lab**
- **Outbound-only telemetry from lab hosts**
- **Principle of Least Privilege (POLP)**
- **Containerized backend deployment**
- **Centralized status view for monitoring and demonstration**

## Current Repository Contents

### Phase 1: Edge Agents
- `edge_agent.py`
  - monitors the specific SRS gNB process on the RAN/RIC laptop
  - checks for Near-RT RIC containers (`e2term`, `e2mgr`, `rtmgr`)
  - sends JSON status updates to the cloud backend every 5 seconds
- `core_edge_agent.py`
  - checks Open5GS core services (`open5gs-amfd`, `open5gs-smfd`, `open5gs-upfd`)
  - parses AMF logs for `Number of gNB-UEs is now X`
  - reports Core health and connected UE count to the cloud backend

### Phase 2: Cloud Backend
- `server.js`
  - Express API with:
    - secured `POST /update-status`
    - public `GET /network-status`
    - CORS enabled for the future frontend
- `package.json`
  - backend dependency manifest
- `Dockerfile`
  - multi-stage build
  - Node.js Alpine builder stage
  - Google Distroless production stage

## Example Telemetry Payloads

RAN/RIC agent:

```json
{
  "node": "ran_ric",
  "status": {
    "ocudu": "up",
    "ric": "up"
  }
}
```

Core agent with UE count:

```json
{
  "node": "core",
  "status": {
    "core": "up",
    "ue_count": 1
  }
}
```

## Current Dashboard

The Netlify-hosted frontend polls `/network-status` and displays the current lab status in a clear demo-friendly UI.

## Notes

- The current backend keeps status in memory, so data resets on restart or redeploy.
- Placeholder secrets and URLs must be replaced before deployment.
- `ue_count` is parsed from recent AMF logs; if the AMF log message has not appeared recently or the agent lacks log read permission, the dashboard will show an unknown UE count.

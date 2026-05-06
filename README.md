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
A static frontend will poll the cloud backend and show live status for:
- Core
- RAN
- RIC

The intended presentation is simple green/red health cards suitable for public viewing.

## Security Goals

This project is intentionally designed around secure systems administration principles:

- **No inbound exposure of the physical lab**
- **Outbound-only telemetry from lab hosts**
- **Principle of Least Privilege (POLP)**
- **Containerized backend deployment**
- **Centralized status view for monitoring and demonstration**

## Current Repository Contents

### Phase 1: Edge Agent
- `edge_agent.py`
  - monitors the specific SRS gNB process on the RAN/RIC laptop
  - checks for Near-RT RIC containers (`e2term`, `e2mgr`, `rtmgr`)
  - sends JSON status updates to the cloud backend every 5 seconds

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

## Example Telemetry Payload

```json
{
  "node": "ran_ric",
  "status": {
    "ocudu": "up",
    "ric": "up"
  }
}
```

## Planned Next Step

### Phase 3: Public Dashboard
Build a lightweight Netlify-hosted frontend that polls `/network-status` and displays the current lab status in a clear demo-friendly UI.

## Notes

- The current backend keeps status in memory, so data resets on restart or redeploy.
- Placeholder secrets and URLs must be replaced before deployment.
- A second edge agent for the Open5GS Core host can be added next to report Core service health.

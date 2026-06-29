# uagents-tg-gateway
Open-source TypeScript SDK and event-listening pipeline connecting Fetch.ai agents on BNB Chain to Telegram channels and secure webhooks for real-time balance, transaction, and launchpad tracking.


# Agent Launch Gateway Utility

An event-driven infrastructure daemon designed to bridge on-chain token creation lifecycles from the Fetch.ai **Agent Launch** pad directly to active communication channels and downstream webhooks. 

This utility acts as a high-performance gateway—polling RPC state, verifying secure microservice handoffs via cryptographic signatures, and delivering real-time telemetry notifications.

---

## 🛠️ System Architecture

The gateway is built as a lightweight, zero-downtime daemon utilizing a three-tier architecture:

1. **On-Chain Event Listener:** Monitors specified Smart Contracts on the Agent Launch bonding curve engine. It polls the RPC provider dynamically to capture wallet states and token registration events (e.g., matching the 120 FET contract interactions).
2. **Cryptographic Webhook Engine:** Packages block data into deterministic payloads, appending a secure **HMAC (Hash-based Message Authentication Code)** signature using a shared secret key to guarantee data integrity for external endpoints.
3. **Telegram Notification Router:** Dispatches formatted, human-readable updates to designated channel operators immediately upon contract state changes.

---

## 🚀 Quick Start & Setup

### Prerequisite Environment Variables
Create a `.env` file in the root directory based on the following template:

```env
RPC_PROVIDER_URL=your_secure_rpc_endpoint
CONTRACT_ADDRESS=0x_agent_launch_bonding_curve_address
WEBHOOK_TARGET_URL=[https://api.yourdomain.com/v1/telemetry](https://api.yourdomain.com/v1/telemetry)
WEBHOOK_HMAC_SECRET=your_super_secret_signing_key
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_CHAT_ID=-100XXXXXXXXXX
POLLING_INTERVAL_MS=5000

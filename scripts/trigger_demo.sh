#!/usr/bin/env bash
# One-command end-to-end demo runner. Assumes:
#   - .env populated with OWNER_PRIVATE_KEY, BASE_SEPOLIA_RPC, deployed addresses
#   - python venv with agent/requirements.txt installed
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "missing .env — copy .env.example and fill it"; exit 1
fi
set -a; source .env; set +a

echo "==> 1. Register a will (5 min inactivity, 2 min challenge)"
python scripts/register_will.py \
  --owner-ens "${OWNER_ENS:-eddy.eth}" \
  --beneficiaries "alice.eth:6000:${OWNER_ADDRESS:-${1:-0x0}},bob.eth:4000:${OWNER_ADDRESS:-${1:-0x0}}" \
  --watched "$USDC_BASE_SEPOLIA" \
  --inactivity 300 --challenge 120 \
  --passphrase "demo-pass"

echo "==> 2. Set WILL_ADDRESS in .env, then start the agent in another terminal:"
echo "    python agent/willkeeper.py"

echo "==> 3. Send a heartbeat to extend the timer:"
echo "    python scripts/heartbeat.py"

echo "==> 4. Wait 5 minutes without pinging — agent will trigger the will"
echo "==> 5. Wait another 2 minutes — agent will execute and distribute"

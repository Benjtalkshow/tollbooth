#!/usr/bin/env bash
# Deploy Tollbooth to Arc mainnet from a wallet you control.
#   DEPLOYER_PRIVATE_KEY   wallet paying gas (USDC is the gas token on Arc)
#   OWNER_ADDRESS          contract owner and protocol fee recipient
#   FEE_BPS                protocol fee, default 50 (0.5%)
set -euo pipefail
: "${DEPLOYER_PRIVATE_KEY:?set DEPLOYER_PRIVATE_KEY}"
: "${OWNER_ADDRESS:?set OWNER_ADDRESS}"
FEE_BPS="${FEE_BPS:-50}"
RPC="${RPC_URL:-https://rpc.mainnet.arc.io}"
USDC=0x3600000000000000000000000000000000000000
cd "$(dirname "$0")/../studio"
forge build --silent
forge create contracts/Tollbooth.sol:Tollbooth \
  --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast \
  --constructor-args "$USDC" "$OWNER_ADDRESS" "$FEE_BPS" "$OWNER_ADDRESS"

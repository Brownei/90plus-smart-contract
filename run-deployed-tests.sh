#!/bin/bash

# Script to run tests against deployed programs on different networks
# Usage: ./run-deployed-tests.sh [network] [test-file]
# Example: ./run-deployed-tests.sh devnet tests/deployed-test.ts

# Default values
NETWORK=${1:-devnet}
TEST_FILE=${2:-tests/deployed-test.ts}

# Validate network
if [[ "$NETWORK" != "devnet" && "$NETWORK" != "testnet" && "$NETWORK" != "mainnet" ]]; then
  echo "Error: Invalid network. Please use 'devnet', 'testnet', or 'mainnet'."
  exit 1
fi

# Define network URLs
DEVNET_URL="https://api.devnet.solana.com"
TESTNET_URL="https://api.testnet.solana.com"
MAINNET_URL="https://api.mainnet-beta.solana.com"

# Set the correct URL based on network
if [[ "$NETWORK" == "devnet" ]]; then
  URL=$DEVNET_URL
elif [[ "$NETWORK" == "testnet" ]]; then
  URL=$TESTNET_URL
else
  URL=$MAINNET_URL
fi

# Run the tests
echo "Running tests against $NETWORK network..."
echo "RPC URL: $URL"
echo "Test file: $TEST_FILE"
echo ""

ANCHOR_PROVIDER_URL=$URL ANCHOR_WALLET=~/.config/solana/id.json yarn run ts-mocha -p ./tsconfig.json -t 1000000 "$TEST_FILE"

# Check if tests passed
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Tests passed successfully!"
else
  echo ""
  echo "❌ Tests failed!"
fi 
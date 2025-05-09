#!/bin/bash

# Script to switch between Solana networks (devnet, testnet, mainnet)
# Usage: ./switch-network.sh [network]
# Example: ./switch-network.sh devnet

# Default to devnet if no argument is provided
NETWORK=${1:-devnet}

# Validate input
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

# Update Solana CLI config
echo "Switching to Solana $NETWORK..."
solana config set --url $URL

# Update Anchor.toml
echo "Updating Anchor.toml configuration..."
sed -i "s/cluster = \".*\"/cluster = \"$NETWORK\"/" Anchor.toml

echo "Successfully switched to $NETWORK"
echo "Solana configuration:"
solana config get

# Display the program IDs for the selected network
echo ""
echo "Program IDs for $NETWORK:"
if [[ "$NETWORK" == "devnet" ]]; then
  echo "Betting: BRjpCHtyQLf1gWwUPQPqsqZbBsmXtmvUNVEi7t9kfPLe"
  echo "Token Granting: H4LdKdwJE1B2qGURGWotvo3oaS14Dj63GsUk5eXuioaq"
elif [[ "$NETWORK" == "testnet" ]]; then
  echo "Betting: BRjpCHtyQLf1gWwUPQPqsqZbBsmXtmvUNVEi7t9kfPLe"
  echo "Token Granting: H4LdKdwJE1B2qGURGWotvo3oaS14Dj63GsUk5eXuioaq"
else
  echo "Betting: (Not deployed yet)"
  echo "Token Granting: (Not deployed yet)"
fi

exit 0
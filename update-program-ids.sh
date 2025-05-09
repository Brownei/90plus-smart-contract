#!/bin/bash

# Script to update program IDs in configuration files
# Usage: ./update-program-ids.sh [network] [program] [program_id]
# Example: ./update-program-ids.sh devnet betting 9Td4ouVX6SUftqAYQozfNEwGp2v6m5XE83GQNS7F5K92

# Default values
NETWORK=${1}
PROGRAM=${2}
PROGRAM_ID=${3}

# Check if all required arguments are provided
if [[ -z "$NETWORK" || -z "$PROGRAM" || -z "$PROGRAM_ID" ]]; then
  echo "Error: Missing arguments."
  echo "Usage: ./update-program-ids.sh [network] [program] [program_id]"
  echo "Example: ./update-program-ids.sh devnet betting 9Td4ouVX6SUftqAYQozfNEwGp2v6m5XE83GQNS7F5K92"
  exit 1
fi

# Validate network
if [[ "$NETWORK" != "devnet" && "$NETWORK" != "testnet" && "$NETWORK" != "mainnet" ]]; then
  echo "Error: Invalid network. Please use 'devnet', 'testnet', or 'mainnet'."
  exit 1
fi

# Validate program
if [[ "$PROGRAM" != "betting" && "$PROGRAM" != "token_granting" ]]; then
  echo "Error: Invalid program. Please use 'betting' or 'token_granting'."
  exit 1
fi

# Validate program ID format (simple check for Solana address format)
if [[ ${#PROGRAM_ID} -ne 44 ]]; then
  echo "Warning: Program ID '$PROGRAM_ID' doesn't appear to be a valid Solana address."
  read -p "Continue anyway? (y/n): " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    exit 1
  fi
fi

echo "Updating $PROGRAM program ID to $PROGRAM_ID for $NETWORK network..."

# Update Anchor.toml
sed -i "/\[programs.$NETWORK\]/,/\[/ s/$PROGRAM = \"[^\"]*\"/$PROGRAM = \"$PROGRAM_ID\"/" Anchor.toml

# Update switch-network.sh
if [[ "$NETWORK" == "devnet" ]]; then
  sed -i "/Program IDs for $NETWORK:/,/elif/ s/^  echo \"$(tr '[:lower:]' '[:upper:]' <<< ${PROGRAM:0:1})${PROGRAM:1}: .*\"/  echo \"$(tr '[:lower:]' '[:upper:]' <<< ${PROGRAM:0:1})${PROGRAM:1}: $PROGRAM_ID\"/" switch-network.sh
elif [[ "$NETWORK" == "testnet" ]]; then
  sed -i "/Program IDs for $NETWORK:/,/else/ s/^  echo \"$(tr '[:lower:]' '[:upper:]' <<< ${PROGRAM:0:1})${PROGRAM:1}: .*\"/  echo \"$(tr '[:lower:]' '[:upper:]' <<< ${PROGRAM:0:1})${PROGRAM:1}: $PROGRAM_ID\"/" switch-network.sh
else
  sed -i "/Program IDs for $NETWORK:/,/fi/ s/^  echo \"$(tr '[:lower:]' '[:upper:]' <<< ${PROGRAM:0:1})${PROGRAM:1}: .*\"/  echo \"$(tr '[:lower:]' '[:upper:]' <<< ${PROGRAM:0:1})${PROGRAM:1}: $PROGRAM_ID\"/" switch-network.sh
fi

# Update config.js if it exists
if [ -f "config.js" ]; then
  if [[ "$PROGRAM" == "betting" ]]; then
    PROGRAM_VAR="BETTING"
  else
    PROGRAM_VAR="TOKEN_GRANTING"
  fi
  
  sed -i "/\[NETWORKS.$NETWORK\]: {/,/}/ s/$PROGRAM_VAR: .*,/$PROGRAM_VAR: new PublicKey('$PROGRAM_ID'),/" config.js
fi

# Update deployed-test.ts
PROGRAM_VAR=$(echo "$PROGRAM" | tr 'a-z' 'A-Z' | tr '_' '_')
sed -i "s/const ${PROGRAM_VAR}_PROGRAM_ID = new anchor.web3.PublicKey(\"[^\"]*\")/const ${PROGRAM_VAR}_PROGRAM_ID = new anchor.web3.PublicKey(\"$PROGRAM_ID\")/" tests/deployed-test.ts

# Update README.md
if [[ "$PROGRAM" == "betting" ]]; then
  DISPLAY_NAME="Betting Program"
else
  DISPLAY_NAME="Token Granting Program"
fi

sed -i "/### $NETWORK/,/### / s|- $DISPLAY_NAME: \`[^`]*\`|- $DISPLAY_NAME: \`$PROGRAM_ID\`|" README.md

echo "Program ID updated successfully in configuration files."
echo "Remember to deploy the program to $NETWORK if you haven't already." 
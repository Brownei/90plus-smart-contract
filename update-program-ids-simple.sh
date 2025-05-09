#!/bin/bash

# Simple script to update program IDs in configuration files
# Usage: ./update-program-ids-simple.sh [network] [program] [program_id]
# Example: ./update-program-ids-simple.sh testnet betting BRjpCHtyQLf1gWwUPQPqsqZbBsmXtmvUNVEi7t9kfPLe

NETWORK=$1
PROGRAM=$2
PROGRAM_ID=$3

if [[ -z "$NETWORK" || -z "$PROGRAM" || -z "$PROGRAM_ID" ]]; then
  echo "Error: Missing arguments."
  echo "Usage: ./update-program-ids-simple.sh [network] [program] [program_id]"
  exit 1
fi

echo "Updating $PROGRAM program ID to $PROGRAM_ID for $NETWORK network..."

# Update Anchor.toml
if grep -q "\[programs.$NETWORK\]" Anchor.toml; then
  sed -i "s/$PROGRAM = \"[^\"]*\"/$PROGRAM = \"$PROGRAM_ID\"/" Anchor.toml
  echo "Updated Anchor.toml"
else
  echo "Could not find [programs.$NETWORK] section in Anchor.toml"
fi

# Update README.md
if [[ "$PROGRAM" == "betting" ]]; then
  NAME="Betting Program"
else
  NAME="Token Granting Program"
fi

sed -i "/### $NETWORK/,/### / s|- $NAME: \`[^`]*\`|- $NAME: \`$PROGRAM_ID\`|" README.md
echo "Updated README.md"

# Update test file
PROGRAM_UPPER=$(echo "$PROGRAM" | tr 'a-z' 'A-Z' | tr '_' '_')
sed -i "s|const ${PROGRAM_UPPER}_PROGRAM_ID = new anchor.web3.PublicKey(\"[^\"]*\")|const ${PROGRAM_UPPER}_PROGRAM_ID = new anchor.web3.PublicKey(\"$PROGRAM_ID\")|" tests/deployed-test.ts
echo "Updated tests/deployed-test.ts"

echo "Program ID updates completed." 
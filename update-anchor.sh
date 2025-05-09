#!/bin/bash

# Simple script to update program IDs in Anchor.toml
# Usage: ./update-anchor.sh [network] [program] [program_id]

NETWORK=$1
PROGRAM=$2
PROGRAM_ID=$3

echo "Updating $PROGRAM program ID to $PROGRAM_ID for $NETWORK network in Anchor.toml..."
sed -i "s/$PROGRAM = \"[^\"]*\"/$PROGRAM = \"$PROGRAM_ID\"/" Anchor.toml
echo "Update completed." 
// This is an example of how you might use the clients in a React application

import React, { useEffect, useState } from 'react';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { BettingClient } from './betting-client';
import { TokenGrantingClient } from './token-granting-client';

// Example React component
function BettingApp() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [bettingClient, setBettingClient] = useState<BettingClient | null>(null);
  const [tokenClient, setTokenClient] = useState<TokenGrantingClient | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize clients when wallet is connected
  useEffect(() => {
    if (publicKey && signTransaction && signAllTransactions) {
      // Create wallet adapter for Anchor
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };

      // Initialize clients
      const betting = new BettingClient(wallet as any, 'testnet');
      const token = new TokenGrantingClient(wallet as any, 'testnet');
      
      setBettingClient(betting);
      setTokenClient(token);
      
      // Load matches (example)
      loadMatches();
    }
  }, [publicKey, signTransaction, signAllTransactions]);

  // Example function to load matches
  const loadMatches = async () => {
    setLoading(true);
    try {
      // Fetch matches from program or API
      // This is just a placeholder, you would need to implement the actual data fetching
      const matchesData = [
        {
          id: 'match123',
          teamA: 'Team A',
          teamB: 'Team B',
          startTime: new Date(Date.now() + 3600000).toISOString(),
          status: 'pending'
        },
        {
          id: 'match456',
          teamA: 'Team C',
          teamB: 'Team D',
          startTime: new Date(Date.now() + 7200000).toISOString(),
          status: 'pending'
        }
      ];
      
      setMatches(matchesData);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Example function to create a match
  const createMatch = async (teamA: string, teamB: string, matchId: string) => {
    if (!bettingClient || !publicKey) return;
    
    try {
      const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      const tx = await bettingClient.createMatch(
        teamA,
        teamB,
        matchId,
        startTime
      );
      
      console.log('Match created with transaction:', tx);
      
      // Refresh matches
      loadMatches();
    } catch (error) {
      console.error('Error creating match:', error);
    }
  };

  // Example function to place a bet
  const placeBet = async (
    matchId: string,
    amount: number,
    predictedWinner: string,
    tokenMint: string,
    bettorTokenAccount: string,
    escrowTokenAccount: string
  ) => {
    if (!bettingClient || !publicKey) return;
    
    try {
      const tx = await bettingClient.placeBet(
        matchId,
        amount,
        predictedWinner,
        new PublicKey(tokenMint),
        new PublicKey(bettorTokenAccount),
        new PublicKey(escrowTokenAccount)
      );
      
      console.log('Bet placed with transaction:', tx);
    } catch (error) {
      console.error('Error placing bet:', error);
    }
  };

  // Render component
  return (
    <div>
      <h1>90plus Betting Platform</h1>
      
      {!publicKey ? (
        <p>Please connect your wallet to continue</p>
      ) : loading ? (
        <p>Loading matches...</p>
      ) : (
        <div>
          <h2>Upcoming Matches</h2>
          {matches.map(match => (
            <div key={match.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <h3>{match.teamA} vs {match.teamB}</h3>
              <p>Match ID: {match.id}</p>
              <p>Start Time: {new Date(match.startTime).toLocaleString()}</p>
              <p>Status: {match.status}</p>
              
              {/* Example bet form */}
              <div>
                <h4>Place a Bet</h4>
                <button onClick={() => placeBet(
                  match.id,
                  1, // 1 token
                  match.teamA, // Predicting Team A will win
                  'your-token-mint-address',
                  'your-token-account-address',
                  'escrow-token-account-address'
                )}>
                  Bet on {match.teamA}
                </button>
                <button onClick={() => placeBet(
                  match.id,
                  1, // 1 token
                  match.teamB, // Predicting Team B will win
                  'your-token-mint-address',
                  'your-token-account-address',
                  'escrow-token-account-address'
                )}>
                  Bet on {match.teamB}
                </button>
              </div>
            </div>
          ))}
          
          <h2>Create a New Match</h2>
          <button onClick={() => createMatch(
            'New Team A',
            'New Team B',
            `match-${Date.now()}` // Using timestamp as a unique ID
          )}>
            Create Match
          </button>
        </div>
      )}
    </div>
  );
}

export default BettingApp; 
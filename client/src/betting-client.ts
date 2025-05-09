import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, Provider, web3, BN, AnchorProvider, Wallet } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
// @ts-ignore
import BettingIDL from './betting.json';

// Define the network and program ID
export type Network = 'devnet' | 'testnet' | 'mainnet';

const PROGRAM_IDS = {
  devnet: 'BRjpCHtyQLf1gWwUPQPqsqZbBsmXtmvUNVEi7t9kfPLe',
  testnet: '9Td4ouVX6SUftqAYQozfNEwGp2v6m5XE83GQNS7F5K92',
  mainnet: '' // Not deployed yet
};

const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com'
};

export class BettingClient {
  private program: Program;
  private provider: Provider;
  private programId: PublicKey;
  private connection: Connection;
  private wallet: Wallet;

  constructor(
    wallet: Wallet,
    network: Network = 'testnet',
    customRpcUrl?: string
  ) {
    // Set up connection
    const rpcUrl = customRpcUrl || RPC_ENDPOINTS[network];
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    // Get program ID for the selected network
    this.programId = new PublicKey(PROGRAM_IDS[network]);
    
    // Set up provider
    this.wallet = wallet;
    this.provider = new AnchorProvider(
      this.connection, 
      this.wallet, 
      { commitment: 'confirmed' }
    );
    
    // Initialize program with IDL
    this.program = new Program(
      BettingIDL as any,
      this.programId,
      this.provider
    );
  }

  /**
   * Initialize the platform configuration
   * @param platformFee Fee percentage charged by the platform (e.g., 5 for 5%)
   */
  public async initialize(platformFee: number): Promise<string> {
    const [platformConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('platform_config')],
      this.programId
    );
    
    try {
      const tx = await this.program.methods
        .initialize(platformFee)
        .accounts({
          platformConfig: platformConfigPda,
          authority: this.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      
      return tx;
    } catch (error) {
      console.error('Error initializing platform:', error);
      throw error;
    }
  }

  /**
   * Create a new match
   */
  public async createMatch(
    teamA: string,
    teamB: string,
    matchId: string,
    startTime: number
  ): Promise<string> {
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      this.programId
    );
    
    try {
      const tx = await this.program.methods
        .createMatch(teamA, teamB, matchId, new BN(startTime))
        .accounts({
          matchAccount: matchPda,
          authority: this.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      
      return tx;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  /**
   * Place a bet on a match
   */
  public async placeBet(
    matchId: string,
    amount: number,
    predictedWinner: string,
    tokenMint: PublicKey,
    bettorTokenAccount: PublicKey,
    escrowTokenAccount: PublicKey
  ): Promise<string> {
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      this.programId
    );
    
    const [betPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('bet'), this.wallet.publicKey.toBuffer(), matchPda.toBuffer()],
      this.programId
    );
    
    const amountBN = new BN(amount * 1000000);
    
    try {
      const tx = await this.program.methods
        .placeBet(amountBN, predictedWinner)
        .accounts({
          bet: betPda,
          matchAccount: matchPda,
          bettor: this.wallet.publicKey,
          bettorTokenAccount: bettorTokenAccount,
          escrowTokenAccount: escrowTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      
      return tx;
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  }

  /**
   * Settle a match by determining the winner
   */
  public async settleMatch(
    matchId: string,
    winner: string
  ): Promise<string> {
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      this.programId
    );
    
    const [platformConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('platform_config')],
      this.programId
    );
    
    try {
      const tx = await this.program.methods
        .settleMatch(winner)
        .accounts({
          matchAccount: matchPda,
          platformConfig: platformConfigPda,
          authority: this.wallet.publicKey,
        })
        .rpc();
      
      return tx;
    } catch (error) {
      console.error('Error settling match:', error);
      throw error;
    }
  }

  /**
   * Claim winnings for a successful bet
   */
  public async claimWinnings(
    matchId: string,
    escrowTokenAccount: PublicKey,
    winnerTokenAccount: PublicKey,
    platformTokenAccount: PublicKey
  ): Promise<string> {
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      this.programId
    );
    
    const [betPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('bet'), this.wallet.publicKey.toBuffer(), matchPda.toBuffer()],
      this.programId
    );
    
    const [platformConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('platform_config')],
      this.programId
    );
    
    try {
      const tx = await this.program.methods
        .claimWinnings()
        .accounts({
          bet: betPda,
          matchAccount: matchPda,
          platformConfig: platformConfigPda,
          escrowTokenAccount: escrowTokenAccount,
          winnerTokenAccount: winnerTokenAccount,
          platformTokenAccount: platformTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      
      return tx;
    } catch (error) {
      console.error('Error claiming winnings:', error);
      throw error;
    }
  }
}

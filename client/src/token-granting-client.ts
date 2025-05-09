import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, Provider, web3, BN, AnchorProvider, Wallet } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
// @ts-ignore
import TokenGrantingIDL from './token_granting.json';

// Define the network and program ID
export type Network = 'devnet' | 'testnet' | 'mainnet';

const PROGRAM_IDS = {
  devnet: 'H4LdKdwJE1B2qGURGWotvo3oaS14Dj63GsUk5eXuioaq',
  testnet: 'H4LdKdwJE1B2qGURGWotvo3oaS14Dj63GsUk5eXuioaq',
  mainnet: '' // Not deployed yet
};

const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com'
};

// Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export class TokenGrantingClient {
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
      TokenGrantingIDL as any,
      this.programId,
      this.provider
    );
  }

  /**
   * Create a new token with metadata
   * @param tokenName Name of the token
   * @param tokenSymbol Symbol of the token
   * @param tokenUri URI for token metadata
   * @returns Transaction signature
   */
  public async createToken(
    tokenName: string,
    tokenSymbol: string,
    tokenUri: string
  ): Promise<string> {
    // Generate a new keypair for the mint account
    const mintKeypair = Keypair.generate();
    
    // Derive the metadata account PDA
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    
    try {
      const tx = await this.program.methods
        .createToken(tokenName, tokenSymbol, tokenUri)
        .accounts({
          payer: this.wallet.publicKey,
          mintAccount: mintKeypair.publicKey,
          metadataAccount: metadataAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKeypair])
        .rpc();
      
      return tx;
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  }

  /**
   * Mint tokens to a recipient
   * @param mintAccount The token mint account
   * @param amount The amount to mint (will be converted to lamports)
   * @param recipient Optional recipient (defaults to wallet owner)
   * @returns Transaction signature
   */
  public async mintToken(
    mintAccount: PublicKey,
    amount: number,
    recipient: PublicKey = this.wallet.publicKey
  ): Promise<string> {
    // Calculate the associated token account for the recipient
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintAccount,
      recipient,
      false
    );
    
    const amountBN = new BN(amount * 1000000); // Convert to lamports (assuming 6 decimals)
    
    try {
      const tx = await this.program.methods
        .mintToken(amountBN)
        .accounts({
          payer: this.wallet.publicKey,
          mintAccount: mintAccount,
          associatedTokenAccount: associatedTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      
      return tx;
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw error;
    }
  }
} 
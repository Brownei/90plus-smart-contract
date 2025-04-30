import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Betting } from "../target/types/betting";
import { TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";
import { before, describe, it } from "node:test";

describe("betting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Betting as Program<Betting>;
  const platformAuthority = provider.wallet;
  
  let platformConfig: anchor.web3.Keypair;
  let matchAccount: anchor.web3.Keypair;
  let betAccount: anchor.web3.Keypair;
  let tokenMint: anchor.web3.PublicKey;
  let escrowTokenAccount: anchor.web3.PublicKey;
  let platformTokenAccount: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let user2TokenAccount: anchor.web3.PublicKey;

  const PLATFORM_FEE = 5; // 5%
  const BET_AMOUNT = new anchor.BN(1000000); // 1 token
  const MATCH_ID = "match123";
  const TEAM_A = "Team A";
  const TEAM_B = "Team B";
  const WINNER = TEAM_A;

  before(async () => {
    // Create platform config
    platformConfig = anchor.web3.Keypair.generate();
    
    // Create token mint
    tokenMint = await createMint(
      provider.connection,
      platformAuthority.payer,
      platformAuthority.publicKey,
      null,
      6
    );

    // Create token accounts
    escrowTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      platformAuthority.payer,
      tokenMint,
      platformConfig.publicKey
    );

    platformTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      platformAuthority.payer,
      tokenMint,
      platformAuthority.publicKey
    );

    userTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      platformAuthority.payer,
      tokenMint,
      provider.wallet.publicKey
    );

    // Mint tokens to user
    await mintTo(
      provider.connection,
      platformAuthority.payer,
      tokenMint,
      userTokenAccount,
      platformAuthority.publicKey,
      BET_AMOUNT.mul(new anchor.BN(10)).toNumber()
    );
  });

  it("Initializes the platform", async () => {
    await program.methods
      .initialize(PLATFORM_FEE)
      .accounts({
        platformConfig: platformConfig.publicKey,
        authority: platformAuthority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([platformConfig])
      .rpc();

    const config = await program.account.platformConfig.fetch(platformConfig.publicKey);
    assert.equal(config.authority.toString(), platformAuthority.publicKey.toString());
    assert.equal(config.platformFee, PLATFORM_FEE);
    assert.isTrue(config.isInitialized);
  });

  it("Creates a match", async () => {
    const [matchPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("match"), Buffer.from(MATCH_ID)],
      program.programId
    );

    await program.methods
      .createMatch(TEAM_A, TEAM_B, MATCH_ID, new anchor.BN(Date.now() / 1000))
      .accounts({
        matchAccount: matchPda,
        authority: platformAuthority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const match = await program.account.match.fetch(matchPda);
    assert.equal(match.teamA, TEAM_A);
    assert.equal(match.teamB, TEAM_B);
    assert.equal(match.matchId, MATCH_ID);
    assert.equal(match.status, { pending: {} });
  });

  it("Places a bet", async () => {
    const [matchPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("match"), Buffer.from(MATCH_ID)],
      program.programId
    );

    const [betPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("bet"),
        provider.wallet.publicKey.toBuffer(),
        matchPda.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .placeBet(BET_AMOUNT, WINNER)
      .accounts({
        bet: betPda,
        matchAccount: matchPda,
        bettor: provider.wallet.publicKey,
        bettorTokenAccount: userTokenAccount,
        escrowTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const bet = await program.account.bet.fetch(betPda);
    assert.equal(bet.bettor.toString(), provider.wallet.publicKey.toString());
    assert.equal(bet.amount.toString(), BET_AMOUNT.toString());
    assert.equal(bet.predictedWinner, WINNER);
    assert.equal(bet.status, { active: {} });
  });

  it("Settles the match", async () => {
    const [matchPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("match"), Buffer.from(MATCH_ID)],
      program.programId
    );

    await program.methods
      .settleMatch(WINNER)
      .accounts({
        matchAccount: matchPda,
        platformConfig: platformConfig.publicKey,
        authority: platformAuthority.publicKey,
      })
      .rpc();

    const match = await program.account.match.fetch(matchPda);
    assert.equal(match.winner, WINNER);
    assert.equal(match.status, { completed: {} });
  });

  it("Claims winnings", async () => {
    const [matchPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("match"), Buffer.from(MATCH_ID)],
      program.programId
    );

    const [betPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("bet"),
        provider.wallet.publicKey.toBuffer(),
        matchPda.toBuffer(),
      ],
      program.programId
    );

    const initialBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);

    await program.methods
      .claimWinnings()
      .accounts({
        bet: betPda,
        matchAccount: matchPda,
        platformConfig: platformConfig.publicKey,
        escrowTokenAccount,
        winnerTokenAccount: userTokenAccount,
        platformTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const finalBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    
    // Calculate expected winnings (2x bet amount minus platform fee)
    const platformFee = BET_AMOUNT.mul(new anchor.BN(PLATFORM_FEE)).div(new anchor.BN(100));
    const expectedWinnings = BET_AMOUNT.mul(new anchor.BN(2)).sub(platformFee);
    
    assert.equal(
      finalBalance.value.uiAmount - initialBalance.value.uiAmount,
      expectedWinnings.toNumber() / 1e6
    );
  });

  it("Fails to place bet on completed match", async () => {
    const [matchPda] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("match"), Buffer.from(MATCH_ID)],
      program.programId
    );

    const [betPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("bet"),
        provider.wallet.publicKey.toBuffer(),
        matchPda.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .placeBet(BET_AMOUNT, WINNER)
        .accounts({
          bet: betPda,
          matchAccount: matchPda,
          bettor: provider.wallet.publicKey,
          bettorTokenAccount: userTokenAccount,
          escrowTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Expected transaction to fail");
    } catch (err) {
      assert.include(err.message, "GameAlreadyStarted");
    }
  });
});

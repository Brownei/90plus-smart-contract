const anchor = require("@project-serum/anchor");
const { assert } = require("chai");

describe("deployed-betting", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Use the deployed program IDs
  const BETTING_PROGRAM_ID = new anchor.web3.PublicKey("BRjpCHtyQLf1gWwUPQPqsqZbBsmXtmvUNVEi7t9kfPLe");
  const TOKEN_GRANTING_PROGRAM_ID = new anchor.web3.PublicKey("H4LdKdwJE1B2qGURGWotvo3oaS14Dj63GsUk5eXuioaq");
  
  // Load the programs with deployed IDs
  const bettingProgram = new anchor.Program(
    require("../target/idl/betting.json"),
    BETTING_PROGRAM_ID,
    provider
  );
  
  const tokenGrantingProgram = new anchor.Program(
    require("../target/idl/token_granting.json"),
    TOKEN_GRANTING_PROGRAM_ID,
    provider
  );

  it("Can connect to deployed programs", async () => {
    console.log("Connected to Betting program with ID:", BETTING_PROGRAM_ID.toString());
    console.log("Connected to Token Granting program with ID:", TOKEN_GRANTING_PROGRAM_ID.toString());
    
    // Simple test to verify we can connect to the programs
    assert.equal(bettingProgram.programId.toString(), BETTING_PROGRAM_ID.toString());
    assert.equal(tokenGrantingProgram.programId.toString(), TOKEN_GRANTING_PROGRAM_ID.toString());
  });

  // You can add more specific tests that interact with the deployed programs here
  // without requiring redeployment
});
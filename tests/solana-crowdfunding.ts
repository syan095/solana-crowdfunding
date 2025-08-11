import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaCrowdfunding } from "../target/types/solana_crowdfunding";
import * as util from "./util";

class Donation {
  donor: anchor.web3.PublicKey;
  amount: anchor.BN;
}

// Contract address
// 2pD6GrSFXbHgJ88NCzQ3sVqDXi7BeAbcRxFirDUBDKUW

describe("solana-crowdfunding", async () => {
  // Configure the client to use the local cluster.
  const connection = anchor.AnchorProvider.env().connection;
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.solanaCrowdfunding as Program<SolanaCrowdfunding>;
  
  let donor_1 = anchor.web3.Keypair.generate();
  let donor_2 = anchor.web3.Keypair.generate();

  const [campaignPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("CAMPAIGN_DEMO"), util.signer.publicKey.toBuffer()],
    program.programId
  );

  it("can create a new campaign", async () => {
    await program.methods.create("Save Timmy", "Save Timmy from the well!")
    .accounts({
      campaign: campaignPda, 
      user: util.signer.publicKey,
    })
    .signers([util.signer])
    .rpc();

    let res = await program.account.campaign.fetch(campaignPda);
    util.assert_eq(res.admin, util.signer.publicKey);
    util.assert_eq(res.name, "Save Timmy");
    util.assert_eq(res.description, "Save Timmy from the well!");
    util.assert_eq(res.donations.length, 0);
  });

  it("can donate to a campaign", async () => {
    // Create a donor and airdrop some sols
    await util.airdropSol(connection, donor_1.publicKey, 10);
    await util.airdropSol(connection, donor_2.publicKey, 10);
    const preBalance = await util.balance(connection, campaignPda);

    // Donate
    await program.methods.donate(util.sol(3.5))
    .accounts({
      campaign: campaignPda, 
      donor: donor_1.publicKey,
    })
    .signers([donor_1])
    .rpc();

    await program.methods.donate(util.sol(6.1))
    .accounts({
      campaign: campaignPda, 
      donor: donor_2.publicKey,
    })
    .signers([donor_2])
    .rpc();

    await program.methods.donate(util.sol(3))
    .accounts({
      campaign: campaignPda, 
      donor: donor_1.publicKey,
    })
    .signers([donor_1])
    .rpc();

    let res = await program.account.campaign.fetch(campaignPda);
    let donations: Donation[] = res.donations;

    util.assert_eq(donations[0].donor, donor_1.publicKey);
    util.assert_eq(donations[0].amount, util.sol(6.5));
    util.assert_eq(donations[1].donor, donor_2.publicKey);
    util.assert_eq(donations[1].amount, util.sol(6.1));

    // Check donor balance.
    await util.assert_balance(connection, donor_1.publicKey, 10-6.5);
    await util.assert_balance(connection, donor_2.publicKey, 10-6.1);
    await util.assert_balance(connection, campaignPda, preBalance + 12.6);
  });

  it("unauthorized cannot withdraw", async () => {
    const preSignerBalance = await util.balance(connection, util.signer.publicKey);
    const preProgramBalance = await util.balance(connection, campaignPda);

    try {
      await
      program.methods.withdraw(util.sol(1.6)).accounts({
        campaign: campaignPda, 
        user: donor_1.publicKey,
      })
      .signers([donor_1])
      .rpc();

      throw new Error("Should Fail");
    } catch (err: any) {
      util.assert_ne(err.message, "Should Fail");
    };
    await util.assert_balance(connection, util.signer.publicKey, preSignerBalance, 5);
    await util.assert_balance(connection, campaignPda, preProgramBalance, 5);
  })

  it("can withdraw", async () => {
    const preSignerBalance = await util.balance(connection, util.signer.publicKey);
    const preProgramBalance = await util.balance(connection, campaignPda);
    const amount = 1.6;
    // Can withdraw
    await program.methods.withdraw(util.sol(amount))
    .accounts({
      campaign: campaignPda, 
      user: util.signer.publicKey,
    })
    .signers([util.signer])
    .rpc();

    // Check 5 digit precision, ignoring gas fee.
    await util.assert_balance(connection, util.signer.publicKey, preSignerBalance + amount, 5);
    await util.assert_balance(connection, campaignPda, preProgramBalance - amount), 5;
  });

  it("cannot withdraw beyond minimum rent", async () => {
    const preSignerBalance = await util.balance(connection, util.signer.publicKey);
    const preProgramBalance = await util.balance(connection, campaignPda);

    try {
      await program.methods.withdraw(await util.balance(connection, campaignPda))
      .accounts({
        campaign: campaignPda, 
        user: util.signer.publicKey,
      })
      .signers([util.signer])
      .rpc();
      throw new Error("Should Fail");
    } catch (err: any) {
      util.assert_ne(err.message, "Should Fail");
    };
    await util.assert_balance(connection, util.signer.publicKey, preSignerBalance, 5);
    await util.assert_balance(connection, campaignPda, preProgramBalance, 5);
  });

  it("can clear donations", async () => {
    // Donate at least once
    await program.methods.donate(util.sol(1))
    .accounts({
      campaign: campaignPda, 
      donor: donor_1.publicKey,
    })
    .signers([donor_1])
    .rpc();

    const preBalance = await util.balance(connection, campaignPda);

    // clear donations
    await program.methods.clearDonations()
    .accounts({
      campaign: campaignPda, 
      user: util.signer.publicKey,
    })
    .signers([util.signer])
    .rpc();
    
    let res = await program.account.campaign.fetch(campaignPda);
    let donations: Donation[] = res.donations;

    util.assert_eq(donations.length, 0);

    await util.assert_balance(connection, campaignPda, preBalance);
  });
});

import { useEffect, useState } from 'react';
import './App.css';
import idl from "./idl.json";
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, BN} from "@coral-xyz/anchor";
import { Buffer } from "buffer";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
window.Buffer = Buffer;

const programId = new PublicKey(idl.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
};
function sol(n) {
    return new BN(n * LAMPORTS_PER_SOL);
}
function fromSol(n) {
    return n / LAMPORTS_PER_SOL;
}

const App = () => {
  const [showCreateCampaignPopup, setShowCreateCampaignPopup] = useState(false);
  const [createCampaignName, setCreateCampaignName] = useState("");
  const [createCampaignDesc, setCreateCampaignDesc] = useState("");
  const [createCampaignErr, setCreateCampaignErr] = useState("");
  const [solAmount, setSolAmount] = useState(0.0001);
  
  const [message, setMessage] = useState("Welcome to crowdfunding!");
  const [walletAddress, setWalletAddress] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  // Setup wallets, connections, Providers etc.
  const getPhantomProvider = () => {
    if ('phantom' in window) {
      const provider = window.phantom?.solana;

      if (provider?.isPhantom) {
        return provider;
      }
    }
  };

  const getSolanaProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(connection, getPhantomProvider(), opts.preflightCommitment);
    return provider;
  };

  const derivePda = (pubkey, program) => {
    const [campaignPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("CAMPAIGN_DEMO"), pubkey.toBuffer()],
        program.programId
      );
    return campaignPda;
  };

  // Popup window that creates a new campaign
  const onCreateCampaign = () => {
    setShowCreateCampaignPopup(true);
  };
  const cancelCreateCampaign = () => {
    setShowCreateCampaignPopup(false);
    setCreateCampaignName("");
    setCreateCampaignDesc("");
    setCreateCampaignErr("");
  };
  const confirmCreateCampaign = async () => {
    if (!createCampaignName.trim() || !createCampaignDesc.trim()) {
      setCreateCampaignErr("Enter name and description.");
      return;
    }
    setShowCreateCampaignPopup(false);
    await createCampaign();
    setCreateCampaignName("");
    setCreateCampaignDesc("");
    setCreateCampaignErr("");
  };
  const renderCreateCampaignPopup = () => {
    return (
      <div className="overlay">
          <h2>Create a new Campaign</h2>
          <input type="text" value={createCampaignName} onChange={(e)=>setCreateCampaignName(e.target.value)}/>
          <input type="text" value={createCampaignDesc} onChange={(e)=>setCreateCampaignDesc(e.target.value)}/>
          <button onClick={confirmCreateCampaign}>Create</button>
          <button onClick={cancelCreateCampaign}>Cancel</button>
          {createCampaignErr && <p className="error">{createCampaignErr}</p>}
        </div>
    )
  }

  // Interact with Solana Program
  const createCampaign = async() => {
    try {
      const solanaProvider = getSolanaProvider();
      const program = new Program(idl, solanaProvider);
      const campaignPda = derivePda(solanaProvider.wallet.publicKey, program);

      await program.methods.create(createCampaignName, createCampaignDesc)
          .accounts({
            campaign: campaignPda, 
            user: solanaProvider.wallet.publicKey,
          })
          .rpc();
      setMessage(`Campaign created: ${campaignPda.toString()}`);
    } catch (error) {
      setMessage(`Error creating campaign account: ${error.message}`);
      if (error.log){
        console.log(error.log);
      }
    }
  };
  const donate = async(campaign) => {
    try {
      const solanaProvider = getSolanaProvider();
      const program = new Program(idl, solanaProvider);

      await program.methods.donate(sol(solAmount))
          .accounts({
            campaign: campaign, 
            donor: solanaProvider.wallet.publicKey,
          })
          .rpc();
      setMessage(`Donated: ${solAmount} to: ${campaign.toString()}`);
    } catch (error) {
      setMessage(`Error donating: ${error.message}`);
      if (error.log){
        console.log(error.log);
      }
    }
  };
  const withdraw = async(campaign) => {
    try {
      const solanaProvider = getSolanaProvider();
      const program = new Program(idl, solanaProvider);

      await program.methods.withdraw(sol(solAmount))
          .accounts({
            campaign: campaign, 
            user: solanaProvider.wallet.publicKey,
          })
          .rpc();
      setMessage(`Withdrew: ${solAmount} to: ${solanaProvider.wallet.publicKey.toString()}`);
    } catch (error) {
      setMessage(`Error Withdrawing: ${error.message}`);
      if (error.log){
        console.log(error.log);
      }
    }
  };
  const clearDonations = async(campaign) => {
    try {
      const solanaProvider = getSolanaProvider();
      const program = new Program(idl, solanaProvider);

      await program.methods.clearDonations()
          .accounts({
            campaign: campaign, 
            user: solanaProvider.wallet.publicKey,
          })
          .rpc();
      setMessage(`Donations cleared`);
    } catch (error) {
      setMessage(`Error clearing donations: ${error.message}`);
      if (error.log){
        console.log(error.log);
      }
    }
  };

  const getCampaigns = async () => {
      const solanaProvider = getSolanaProvider();
      const program = new Program(idl, solanaProvider);

      Promise.all((await solanaProvider.connection.getProgramAccounts(programId)).map(async (campaign) => ({
        ...(await program.account.campaign.fetch(campaign.pubkey)),
        pubkey: campaign.pubkey,
        })))
        .then((campaigns) => {
          campaigns.forEach(campaign => {
            if (!campaign.donations) {
                campaign.total = 0.0;
              } else {
                campaign.total = campaign.donations.reduce((total, d) => {
                  return total + parseFloat(d.amount);
                }, 0.0);
              }
          });
          setCampaigns(campaigns);
        });
  };

  const connectWallet = async() => {
    const phantomProvider = getPhantomProvider();
    const response = await phantomProvider.connect();
    console.log(`Phantom wallet connected: ${response.publicKey.toString()}`);
    
    setWalletAddress(response.publicKey.toString());
  };
  
  useEffect(() => {
    const onLoad = async() => {
      try {
        const phantomProvider = getPhantomProvider();
        if(phantomProvider) {
          const response = await phantomProvider.connect({onlyIfTrusted: true});
          console.log(`Phantom wallet connected: ${response.publicKey.toString()}`);

          setWalletAddress(response.publicKey.toString());
          getCampaigns();
        }
        
      } catch(error) {
        console.error(error);
      }
    }
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // Rendering functions
  const renderConnectedContainer = () => {
    return <>
      <p>{message}</p>
      <button onClick={onCreateCampaign}>Create new campaign</button>
      <br/>
      <button onClick={getCampaigns}>Refresh Campaigns</button>
      <br />
      <label>Amount in Sol:</label>
      <input type="number" value={solAmount} onChange={(e)=>setSolAmount(e.target.value)}/>
      <p>Existing Campaigns:</p>
      {campaigns.map((campaign, index) => (<div key={index}>
        <p>Campaign ID: {campaign.pubkey.toString()}</p>
        <p>Admin: {campaign.admin.toString()}</p>
        <p>Name: {campaign.name} Description: {campaign.description}</p>
        <p><button onClick={async () => {
          await donate(campaign.pubkey);
          getCampaigns();
        }}>Donate</button>
        { campaign.admin.toString() == walletAddress.toString() && (<>
        <button onClick={async () => {
          await withdraw(campaign.pubkey);
          getCampaigns();
        }}>Withdraw</button>
        <button onClick={async () => {
          await clearDonations(campaign.pubkey);
          getCampaigns();
        }}>Clear Donations</button></>)}</p>
        <p>Donations: (total: {fromSol(campaign.total)})</p>
        <div className='table-container'>
        <table className='styled-table'>
        <thead><tr><th></th><th>Donor</th><th>Amount</th></tr></thead>
        <tbody>
        {campaign.donations.map((donation, index) => (
          <tr key={index}>
            <td>{index}</td><td>{donation.donor.toString()}</td><td>{fromSol(donation.amount)}</td>
          </tr>
        ))}
        </tbody>
        </table></div>
        <br/>
      </div>))}
      </>;
  }
 
  return (<div className="App">
    {showCreateCampaignPopup && renderCreateCampaignPopup() }
    {!walletAddress && <button onClick={connectWallet}>Connect to Wallet</button>}
    {walletAddress && renderConnectedContainer() }
    
  </div>)
}
export default App;
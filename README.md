# Solana Crowdfunding
This is a practice project to learn about Solana smart Programs.
This project allows users to create their crowdfunding campaign and donate to campaigns created by others.

## Solana Program
The Solana program can be found in the `programs` folder, and contains the following functions

### Create campaign
Creates a new campaign with a `name` and a `description`. Only 1 campaign can be created per account. The signing account is the `admin` of the program.

### Donate
Any user can donate to an existing campaign. A donation record is kept within the campaign account.

### Withdraw
The admin of a campaign can withdraw funds from the campaign. Withdrawing funds beyond the minimum rent is prohibited.

### Clear donation
The admin of a campaign can clear the donation record of a campaign. Note this action only clears the record storage, no balance changes will occur.

## Mocha tests for the Solana program
The unit tests can be found in the `tests` folder.
Ensure you have: Rust, Solana CLI, Anchor, and Node.js installed. To run the tests, run:
```sh copy
anchor test
```

To deploy the contract on devnet, run:
```sh copy
anchor deploy --provider.cluster devnet
```

## Frontend
A simple front-end is written with ReactJS that allows the user to interact with the Program. You can find it in the `frontend` folder. To use it, ensure the Phantom wallet is installed on the browser. To run the frontend, run:
```sh copy
npm run start
```

On the webpage, the user can create a new campaign and see all existing campaigns deployed on the Solana Devnet, with all the donation records.

The user can donate to any existing campaigns.

If the current user is the `admin` of a campaign, the user can also withdraw or Clear the donation record for the campaign that they administrates.







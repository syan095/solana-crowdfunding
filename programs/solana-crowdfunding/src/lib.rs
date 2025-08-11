use anchor_lang::prelude::*;

declare_id!("2pD6GrSFXbHgJ88NCzQ3sVqDXi7BeAbcRxFirDUBDKUW");

#[program]
pub mod solana_crowdfunding {
    use anchor_lang::solana_program::{entrypoint::ProgramResult, program::invoke};
    use solana_system_interface;

    use super::*;

    pub fn create(ctx: Context<Create>, name: String, description: String) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        campaign.name = name.clone();
        campaign.description = description.clone();
        campaign.admin = ctx.accounts.user.key.clone();

        msg!(
            "Crowdfunding campaigned created. \n{}: {}",
            name,
            description
        );
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        let user = &mut ctx.accounts.user;

        // Ensure enough fund is left for rent exemption
        if campaign.admin != *user.key {
            return Err(ProgramError::IncorrectAuthority);
        }
        let rent_balance = Rent::get()?.minimum_balance(campaign.to_account_info().data_len());
        if **campaign.to_account_info().lamports.borrow() - rent_balance < amount {
            return Err(ProgramError::InsufficientFunds);
        }

        // Withdraw fund into admin's account
        **campaign.to_account_info().try_borrow_mut_lamports()? -= amount;
        **user.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    pub fn donate(ctx: Context<Donate>, amount: u64) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        let donor = &mut ctx.accounts.donor;

        // Transfer fund into campaign account
        invoke(
            &solana_system_interface::instruction::transfer(
                donor.key,
                campaign.to_account_info().key,
                amount,
            ),
            &[donor.to_account_info(), campaign.to_account_info()],
        )?;

        // Write donation into record.
        match campaign
            .donations
            .iter_mut()
            .find(|donation| donation.donor == donor.key())
        {
            Some(donation) => donation.amount += amount,
            None => campaign.donations.push(Donation {
                donor: donor.key.clone(),
                amount,
            }),
        };

        Ok(())
    }

    pub fn clear_donations(ctx: Context<Withdraw>) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        let user = &mut ctx.accounts.user;

        // Ensure enough fund is left for rent exemption
        if campaign.admin != *user.key {
            return Err(ProgramError::IncorrectAuthority);
        }

        campaign.donations.clear();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer=user, space=1000, seeds=[b"CAMPAIGN_DEMO".as_ref(), user.key().as_ref()], bump)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub donor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Campaign {
    pub admin: Pubkey,
    pub name: String,
    pub description: String,
    pub donations: Vec<Donation>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Donation {
    pub donor: Pubkey,
    pub amount: u64,
}

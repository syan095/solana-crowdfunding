import { Keypair, Connection, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import assert from "assert";

export const SOL_DIGITS: number = 9;

export async function airdropSol(
  connection: Connection,
  to: PublicKey,
  amount: number
): Promise<void> {
    const pre_balance = await connection.getBalance(to);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");

    await connection.confirmTransaction(
        {
            signature: await connection.requestAirdrop(
                to,
                amount * LAMPORTS_PER_SOL
            ),
            blockhash,
            lastValidBlockHeight,
        },
        "confirmed",
    );

    const post_balance = await connection.getBalance(to);
    if ((post_balance-pre_balance) != amount * LAMPORTS_PER_SOL) {
        assert.ok(false, `Airdrop failed. Balance: ${post_balance}`);
    } else {
        console.log(`Airdropped ${amount} to ${to}. New balance: ${post_balance}`);
    }
}

export async function balance(connection: Connection, who: PublicKey): Promise<number> {
    return await connection.getBalance(who) / 10**SOL_DIGITS;
}

export async function assert_balance(connection: Connection, who: PublicKey, balance: number, digit_precision: number = 8) {
    assert.ok(digit_precision >= 0 && digit_precision <=SOL_DIGITS);
    const revDigits = SOL_DIGITS - digit_precision

    assert_eq(
        Math.round(await connection.getBalance(who) / 10**revDigits),
        Math.round(balance * 10**digit_precision)
    );
}


/// CFnQk1nVmkPThKvLU8EUPFtTuJro45JLSoqux4v23ZGy
/// a73a08326a00ef947d2e2ade77018677c3bd4fd4677cbcd3278a6f37303dbbde
export const signer = Keypair.fromSecretKey(new Uint8Array([
    226, 206, 230, 109, 13, 92, 27, 171,
    19, 207, 171, 250, 141, 6, 202, 169,
    90, 202, 5, 242, 193, 77, 251, 187,
    58, 197, 151, 160, 67, 95, 147, 186,
    167, 58, 8, 50, 106, 0, 239, 148,
    125, 46, 42, 222, 119, 1, 134, 119,
    195, 189, 79, 212, 103, 124, 188, 211,
    39, 138, 111, 55, 48, 61, 187, 222,
]));

/// CF1VaGasLWaYvR9PYAVDysjWH7ewuN8KAUSXudfySvxh
/// a7073e9b3a053d968f4ad918993953ca35f64584ab3bfdfb520706fc190e433a
export const signer2 = Keypair.fromSecretKey(new Uint8Array([
    55, 12, 170, 216, 146, 97, 211, 92, 226, 132, 60, 38, 236, 179, 128, 201, 149, 240, 27, 28,
    134, 92, 207, 112, 196, 97, 193, 57, 212, 186, 151, 150, 167, 7, 62, 155, 58, 5, 61, 150,
    143, 74, 217, 24, 153, 57, 83, 202, 53, 246, 69, 132, 171, 59, 253, 251, 82, 7, 6, 252, 25,
    14, 67, 58,
]));

export function bn(n: number): anchor.BN {
  return new anchor.BN(n);
}

export function sol(n: number): anchor.BN {
    return bn(n * LAMPORTS_PER_SOL)
}

// utility `assert_eq` that contains .equals() fallback
// and prints the values on failure
export function assert_eq(a: any, b: any): void {
    let eq = false;
    if (a instanceof PublicKey && b instanceof PublicKey) {
        eq = a.equals(b);
    } else if (a instanceof anchor.BN && b instanceof anchor.BN) {
        eq = a.eq(b);
    } 
    else {
        eq = a === b;
    }

    if (!eq) {
        console.error(`Eq assertion failed: a: ${a} != b: ${b}`);
        assert.ok(false);
    }
}

export function assert_ne(a: any, b: any): void {
    let eq = false;
    if (a instanceof PublicKey && b instanceof PublicKey) {
        eq = a.equals(b);
    } else if (a instanceof anchor.BN && b instanceof anchor.BN) {
        eq = a.eq(b);
    } 
    else {
        eq = a === b;
    }

    if (eq) {
        console.error(`Not Eq failed: a: ${a} != b: ${b}`);
        assert.ok(false);
    }
}

const express = require('express');
const path = require('path');
const { Connection, clusterApiUrl, PublicKey, Transaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

const connection = new Connection(clusterApiUrl('devnet'));
const PYUSD_TOKEN_MINT = 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM';
const RECIPIENT_ADDRESS = 'ARFwpM41PsUudu1HQE7i1HbbP6nkDAnKYRc77KQMS18e';
const TOKEN2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

let userCredits = {};

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/wallet', async (req, res) => {
    const walletAddress = req.query.address;
    if (!walletAddress) {
        return res.status(400).send('Wallet address is required');
    }

    try {
        const publicKey = new PublicKey(walletAddress);
        const balance = await connection.getBalance(publicKey);
        const balanceInSol = balance / LAMPORTS_PER_SOL;

        const tokenMintPublicKey = new PublicKey(PYUSD_TOKEN_MINT);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: tokenMintPublicKey });
        let pyusdBalance = 0;
        if (tokenAccounts.value.length > 0) {
            pyusdBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        }

        if (!(walletAddress in userCredits)) {
            userCredits[walletAddress] = 0;
        }

        const credits = userCredits[walletAddress];

        if (req.query.json === 'true') {
            return res.json({
                balanceInSol,
                pyusdBalance,
                credits
            });
        }

        res.render('wallet', {
            walletAddress,
            balanceInSol,
            pyusdBalance,
            credits
        });
    } catch (err) {
        console.error('Error fetching wallet info:', err);
        res.status(500).send('Error fetching wallet info');
    }
});

app.post('/create-transaction', async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) {
        console.error('Wallet address is required');
        return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }

    try {
        const fromPublicKey = new PublicKey(walletAddress);
        const toPublicKey = new PublicKey(RECIPIENT_ADDRESS);
        const mintPublicKey = new PublicKey(PYUSD_TOKEN_MINT);

        console.log('From Address:', fromPublicKey.toBase58());
        console.log('To Address:', toPublicKey.toBase58());

        console.log('Getting associated token addresses...');
        const fromTokenAccountAddress = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey, true, TOKEN2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        const toTokenAccountAddress = await getAssociatedTokenAddress(mintPublicKey, toPublicKey, true, TOKEN2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

        console.log('From Account Address:', fromTokenAccountAddress.toBase58());
        console.log('To Account Address:', toTokenAccountAddress.toBase58());

        console.log('Fetching recent blockhash...');
        const { blockhash } = await connection.getRecentBlockhash();

        console.log('Creating transfer transaction...');
        const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: fromPublicKey
        });

        // Check if fromTokenAccount exists
        const fromTokenAccountInfo = await connection.getAccountInfo(fromTokenAccountAddress);
        if (!fromTokenAccountInfo) {
            console.log('Creating fromTokenAccount...');
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    fromPublicKey,
                    fromTokenAccountAddress,
                    fromPublicKey,
                    mintPublicKey,
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                    TOKEN2022_PROGRAM_ID
                )
            );
        }

        // Check if toTokenAccount exists
        const toTokenAccountInfo = await connection.getAccountInfo(toTokenAccountAddress);
        if (!toTokenAccountInfo) {
            console.log('Creating toTokenAccount...');
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    fromPublicKey,
                    toTokenAccountAddress,
                    toPublicKey,
                    mintPublicKey,
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                    TOKEN2022_PROGRAM_ID
                )
            );
        }

        // Add the transfer checked instruction
        transaction.add(
            createTransferCheckedInstruction(
                fromTokenAccountAddress,
                mintPublicKey,
                toTokenAccountAddress,
                fromPublicKey,
                0.25 * 10 ** 6, // Assuming 6 decimal places for PYUSD token, adjust if different
                6, // Decimal places
                [],
                TOKEN2022_PROGRAM_ID
            )
        );

        console.log('Serializing transaction...');
        const transactionBase64 = transaction.serialize({ requireAllSignatures: false }).toString('base64');
        console.log('Transaction serialized:', transactionBase64);

        res.json({ success: true, transaction: transactionBase64 });
    } catch (err) {
        console.error('Error creating transaction:', err);
        res.status(500).json({ success: false, error: 'Error creating transaction' });
    }
});

app.post('/send-transaction', async (req, res) => {
    const { signedTransaction, walletAddress } = req.body;
    if (!signedTransaction) {
        console.error('Signed transaction is required');
        return res.status(400).json({ success: false, error: 'Signed transaction is required' });
    }

    if (!walletAddress) {
        console.error('Wallet address is required');
        return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }

    try {
        console.log('Deserializing signed transaction...');
        const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));

        console.log('Sending signed transaction...');
        const signature = await connection.sendRawTransaction(transaction.serialize());

        console.log('Confirming transaction...');
        await connection.confirmTransaction(signature);

        // Increment credits
        if (!(walletAddress in userCredits)) {
            userCredits[walletAddress] = 0;
        }
        userCredits[walletAddress] += 1;

        res.json({ success: true, signature });
    } catch (err) {
        console.error('Error sending transaction:', err);

        if (err.logs) {
            console.error('Transaction logs:', err.logs);
        }

        res.status(500).json({ success: false, error: 'Error sending transaction', logs: err.logs });
    }
});

app.post('/deduct-credits', (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) {
        return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }

    const credits = userCredits[walletAddress] || 0;

    if (credits < 2) {
        return res.status(400).json({ success: false, error: 'Insufficient credits' });
    }

    userCredits[walletAddress] = credits - 2;
    res.json({ success: true, credits: userCredits[walletAddress] });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
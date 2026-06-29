const crypto = require('crypto');
const axios = require('axios');
const { JsonRpcProvider, formatEther } = require('ethers');

const isSimulation = process.argv.includes('--simulate');

const CONFIG = {
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
    agentWallet: process.env.TARGET_AGENT_WALLET || "0x031b41e504677879370e9dbcf937283a8691fa7f", 
    threshold: parseFloat(process.env.MIN_BALANCE_THRESHOLD || "1.5"),
    tgToken: process.env.TELEGRAM_BOT_TOKEN || null,
    tgChatId: process.env.TELEGRAM_CHAT_ID || null,
    webhookUrl: process.env.WEBHOOK_DESTINATION_URL || null,
    webhookSecret: process.env.WEBHOOK_SECRET_HMAC || "agent_launch_secret_fallback"
};

function generateHMACSignedPayload(payload, secret) {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

async function dispatchAlerts(currentBalance, txHash = null) {
    const payload = {
        event: "AGENT_BALANCE_LOW",
        network: "BNB_CHAIN_MAINNET",
        wallet: CONFIG.agentWallet,
        currentBalance: `${currentBalance} BNB/FET`,
        thresholdLimit: `${CONFIG.threshold} BNB/FET`,
        txHash: txHash || "0x_simulated_transaction_hash",
        timestamp: Date.now()
    };

    console.warn(`[ALERT] Threshold breached! Dispatching gateway alerts...`);

    if (CONFIG.webhookUrl) {
        try {
            const signature = generateHMACSignedPayload(payload, CONFIG.webhookSecret);
            await axios.post(CONFIG.webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json', 'X-Gateway-Signature': signature },
                timeout: 4000
            });
            console.log(`[WEBHOOK] Payload securely posted.`);
        } catch (err) {
            console.error(`[WEBHOOK_ERROR] Transmission deferred: ${err.message}`);
        }
    }

    if (CONFIG.tgToken && CONFIG.tgChatId) {
        try {
            const messageText = `⚠️ *uAgents Gateway Alert*\n\n*Agent Wallet:* \`${CONFIG.agentWallet}\`\n*Current Balance:* \`${currentBalance} Tokens\`\n*Tx Hash:* \`${payload.txHash}\``;
            await axios.post(`https://api.telegram.org/bot${CONFIG.tgToken}/sendMessage`, {
                chat_id: CONFIG.tgChatId,
                text: messageText,
                parse_mode: 'Markdown'
            });
            console.log(`[TELEGRAM] Broadcast payload routed.`);
        } catch (err) {
            console.error(`[TELEGRAM_ERROR] Broadcast failed: ${err.message}`);
        }
    }
}

async function runGatewayDaemon() {
    if (isSimulation) {
        console.log(`[SIMULATION] Running daemon simulation flag...`);
        console.log(`[SIMULATION] Tracking Wallet: ${CONFIG.agentWallet}`);
        const mockBalance = "0.4200";
        const mockTx = "0x89b6c89163229bbf9a87d00f807df47fb1f2c270a6d0c1c876f2d2429f52bb4a";
        console.log(`[LOG] Simulated Check: Balance (${mockBalance}) below threshold (${CONFIG.threshold})`);
        await dispatchAlerts(mockBalance, mockTx);
        process.exit(0);
    }

    console.log(`[INIT] Initializing @agentlaunch/uagents-tg-gateway...`);
    try {
        const provider = new JsonRpcProvider(CONFIG.rpcUrl);
        const balanceWei = await provider.getBalance(CONFIG.agentWallet);
        const balanceEther = parseFloat(formatEther(balanceWei));
        console.log(`[SYSTEM] Current Balance = ${balanceEther.toFixed(4)} Tokens`);

        if (balanceEther < CONFIG.threshold) {
            await dispatchAlerts(balanceEther.toFixed(4));
        }
    } catch (error) {
        console.error(`[FATAL_LAUNCH_FAIL] Provider error: ${error.message}`);
    }
}

runGatewayDaemon();

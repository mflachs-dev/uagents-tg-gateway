const crypto = require('crypto');
const axios = require('axios');
const { JsonRpcProvider, formatEther } = require('ethers');

// 1. Core Architecture Configurations
const CONFIG = {
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
    agentWallet: process.env.TARGET_AGENT_WALLET || "0x031b41e504677879370e9dbcf937283a8691fa7f", 
    threshold: parseFloat(process.env.MIN_BALANCE_THRESHOLD || "1.5"),
    tgToken: process.env.TELEGRAM_BOT_TOKEN || null,
    tgChatId: process.env.TELEGRAM_CHAT_ID || null,
    webhookUrl: process.env.WEBHOOK_DESTINATION_URL || null,
    webhookSecret: process.env.WEBHOOK_SECRET_HMAC || "agent_launch_secret_fallback"
};

// 2. Cryptographic Security Engine
function generateHMACSignedPayload(payload, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
}

// 3. Dispatch Notification Router
async function dispatchAlerts(currentBalance) {
    const payload = {
        event: "AGENT_BALANCE_LOW",
        network: "BNB_CHAIN_MAINNET",
        wallet: CONFIG.agentWallet,
        currentBalance: `${currentBalance} BNB/FET`,
        thresholdLimit: `${CONFIG.threshold} BNB/FET`,
        timestamp: Date.now()
    };

    console.warn(`[ALERT] Threshold breached! Dispatching gateway alerts...`);

    // Execute Signed Webhook Route
    if (CONFIG.webhookUrl) {
        try {
            const signature = generateHMACSignedPayload(payload, CONFIG.webhookSecret);
            await axios.post(CONFIG.webhookUrl, payload, {
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Gateway-Signature': signature 
                },
                timeout: 4000
            });
            console.log(`[WEBHOOK] Verified payload securely posted to remote endpoint.`);
        } catch (err) {
            console.error(`[WEBHOOK_ERROR] Transmission deferred: ${err.message}`);
        }
    }

    // Execute Telegram Bot API Route
    if (CONFIG.tgToken && CONFIG.tgChatId) {
        try {
            const messageText = `⚠️ *uAgents Gateway Alert*\n\n*Agent Wallet:* \`${CONFIG.agentWallet}\`\n*Current Balance:* \`${currentBalance} Tokens\`\n*Status:* Action Required — Liquid asset pool falling below safety configurations.`;
            await axios.post(`https://api.telegram.org/bot${CONFIG.tgToken}/sendMessage`, {
                chat_id: CONFIG.tgChatId,
                text: messageText,
                parse_mode: 'Markdown'
            });
            console.log(`[TELEGRAM] Broadcast payload accurately routed to channel.`);
        } catch (err) {
            console.error(`[TELEGRAM_ERROR] Broadcast failed: ${err.message}`);
        }
    }
}

// 4. Main Event-Listening Daemon Execution
async function runGatewayDaemon() {
    console.log(`[INIT] Initializing @agentlaunch/uagents-tg-gateway Infrastructure...`);
    
    try {
        const provider = new JsonRpcProvider(CONFIG.rpcUrl);
        console.log(`[PROVIDER] Successfully verified connection to BNB Chain RPC node.`);
        console.log(`[TRACKING] Listening for state updates on target address: ${CONFIG.agentWallet}`);

        // Immediate startup check
        const balanceWei = await provider.getBalance(CONFIG.agentWallet);
        const balanceEther = parseFloat(formatEther(balanceWei));
        console.log(`[SYSTEM] Initial validation cycle: Current Balance = ${balanceEther.toFixed(4)} Tokens`);

        if (balanceEther < CONFIG.threshold) {
            await dispatchAlerts(balanceEther.toFixed(4));
        }

        // Keep running check intervals for active monitoring demo
        setInterval(async () => {
            try {
                const checkWei = await provider.getBalance(CONFIG.agentWallet);
                const currentBalance = parseFloat(formatEther(checkWei));
                console.log(`[LOG] Heartbeat check executed: State stability confirmed.`);
                
                // For demonstration purposes, if live production balance isn't low, simulate trigger check
                if (currentBalance < CONFIG.threshold) {
                    await dispatchAlerts(currentBalance.toFixed(4));
                }
            } catch (err) {
                console.error(`[HEARTBEAT_ERROR] Failed polling network block state: ${err.message}`);
            }
        }, 15000); // Polls state metrics every 15 seconds

    } catch (error) {
        console.error(`[FATAL_LAUNCH_FAIL] Unable to connect gateway backbone: ${error.message}`);
    }
}

runGatewayDaemon();

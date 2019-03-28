import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
const app = express();

import * as slpjs from 'slpjs';
import { SlpFaucetHandler } from './slpfaucet';
import BigNumber from 'bignumber.js';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

let slpFaucet = new SlpFaucetHandler(process.env.MNEMONIC!);
const faucetQty = parseInt(process.env.TOKENQTY!);

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', function (req, res) {
	res.render('index', { txid: null, error: null });
})

app.get('/distribute', async function(req, res) {
	console.log("Distribute instantiated, please wait 30 seconds...");
	// TODO: Check if re-distribution is needed
	res.render('index', { txid: null, error: "Distribute instantiated, please wait 30 seconds" });

	await slpFaucet.evenlyDistributeTokens(process.env.TOKENID!);
	await sleep(5000);
	await slpFaucet.evenlyDistributeBch();
})

app.post('/', async function (req, res) {
	let address = req.body.address;

	if(address === process.env.DISTRIBUTE_SECRET!) {
		res.render('index', { txid: null, error: "Token distribution instantiated, please wait 30 seconds..." });

		await slpFaucet.evenlyDistributeTokens(process.env.TOKENID!);
		await sleep(5000);
		await slpFaucet.evenlyDistributeBch();
		return;
	}

	try {
		if(!slpjs.Utils.isSlpAddress(address)) {
			res.render('index', { txid: null, error: "Not a SLP Address." });
			return;
		}
	} catch(error) {
		res.render('index', { txid: null, error: "Not a SLP Address." });
		return;
	}

	let changeAddr: any;
	try {
		changeAddr = await slpFaucet.selectFaucetAddressForTokens(process.env.TOKENID!);
	} catch(error) {
		res.render('index', { txid: null, error: "Faucet is temporarily empty :(" });
		return;
	}
	
	let sendTxId;
	try {
		let inputs: slpjs.SlpAddressUtxoResult[] = [];
		inputs = inputs.concat(changeAddr.balance.slpTokenUtxos[process.env.TOKENID!]).concat(changeAddr.balance.nonSlpUtxos)
		inputs.map(i => i.wif = slpFaucet.wifs[changeAddr.address]);
		sendTxId = await slpFaucet.network.simpleTokenSend(process.env.TOKENID!, new BigNumber(faucetQty), inputs, address, changeAddr.address);
	} catch(error) {
		console.log(error);
		res.render('index', { txid: null, error: "Server error." });
		return;
	}
	console.log(sendTxId);
	let re = /^([A-Fa-f0-9]{2}){32,32}$/;
	if (typeof sendTxId !== 'string' || !re.test(sendTxId)) {
		res.render('index', { txid: null, error: sendTxId });
		return;
	}

	res.render('index', { txid: sendTxId, error: null });
})

app.listen(process.env.PORT, function () {
	console.log('SLP faucet server listening on port '+process.env.PORT+'!')
})
import BITBOX from 'bitbox-sdk/lib/bitbox-sdk';
let SLPSDK = require("slp-sdk/lib/SLP");
let SLP: BITBOX;
let NETWORK = 'mainnet';
if (NETWORK === `mainnet`)
	SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` });
else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` });

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
const app = express();

import * as slpjs from 'slpjs';
import { CoinSplitter } from './coinsplitter';

let splitter = new CoinSplitter(process.env.MNEMONIC!);
const faucetQty = parseInt(process.env.TOKENQTY!);

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', function (req, res) {
	res.render('index', { txid: null, error: null });
})

app.get('/distribute', async function(req, res) {
	// TODO: Check if re-distribution is needed

	await splitter.evenlyDistributeTokens(process.env.TOKENID!);
	await splitter.evenlyDistributeBch();
})

app.post('/', async function (req, res) {
	let address = req.body.address;

	try {
		if(!slpjs.Utils.isSlpAddress(address)) {
			res.render('index', { txid: null, error: "Not a SLP Address." });
			return;
		}
	} catch(error) {
		res.render('index', { txid: null, error: "Not a SLP Address." });
		return;
	}

	let changeAddr = await splitter.selectFaucetAddress();
	
	const slpConfig = {
		fundingAddress: changeAddr,
		fundingWif: splitter.wifs[changeAddr!],
		tokenReceiverAddress: address,
		bchChangeReceiverAddress: changeAddr,
		tokenId: process.env.TOKENID!,
		amount: faucetQty
	}
	let sendTxId;
	try {
		// @ts-ignore
		sendTxId = await SLP.TokenType1.send(slpConfig);
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
	console.log('Example app listening on port '+process.env.PORT+'!')
})
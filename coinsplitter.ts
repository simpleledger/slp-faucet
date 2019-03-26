import BITBOX from 'bitbox-sdk/lib/bitbox-sdk';
let SLPSDK = require("slp-sdk/lib/SLP");
let SLP: BITBOX;
let NETWORK = 'mainnet';
if (NETWORK === `mainnet`)
	SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` });
else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` });
import * as slpjs from 'slpjs';
import BigNumber from 'bignumber.js';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const getRawTransactions = async function(txids: string[]) {
	let res = await SLP.RawTransactions.getRawTransaction(txids);
	await sleep(1000);
	return res;
}

export class CoinSplitter {
    addresses: string[];
    wifs: { [key: string]: string }
    validator: slpjs.LocalValidator;
    network: slpjs.BitboxNetwork;

    constructor(mnemonic: string) {
        let masterNode = SLP.HDNode.fromSeed(SLP.Mnemonic.toSeed(mnemonic!)).derivePath("m/44'/245'/0'");
        this.addresses = [];
        this.wifs = {};
        for(let i = 0; i < 18; i++) {
            let childNode = masterNode.derivePath("0/" + i);
            let address = slpjs.Utils.toSlpAddress(SLP.ECPair.toCashAddress(SLP.ECPair.fromWIF(SLP.HDNode.toWIF(childNode))))
            this.wifs[address] = SLP.HDNode.toWIF(childNode);
            this.addresses.push(address);
        }
        this.validator = new slpjs.LocalValidator(SLP, getRawTransactions);
        this.network = new slpjs.BitboxNetwork(SLP, this.validator);
    }

    async evenlyDistributeTokens(tokenId: string): Promise<string> {
        // TODO: use a threshold to determine if split should be made

        if(this.addresses.length > 19)
            throw Error("Cannot split token to more than 19 addresses");
        let balances = ((await this.network.getAllSlpBalancesAndUtxos(this.addresses)) as R[])
        let utxos: slpjs.SlpAddressUtxoResult[] = [];
        let tokenBalances = balances.filter(i => { try { return i.result.slpTokenBalances[tokenId].isGreaterThan(0) } catch(_){ return false; }});
        tokenBalances.map<void>(i => i.result.slpTokenUtxos[tokenId].forEach(j => j.wif = this.wifs[<any>i.address]));
        tokenBalances.forEach(a => Object.keys(a.result.slpTokenUtxos).forEach(id => a.result.slpTokenUtxos[id].forEach(txo => utxos.push(txo))));
        let totalToken: BigNumber = tokenBalances.reduce((t, v) => t = t.plus(v.result.slpTokenBalances[tokenId]), new BigNumber(0))
        let bchBalances = balances.filter(i => i.result.nonSlpUtxos.length > 0);
        bchBalances.map(i => i.result.nonSlpUtxos.forEach(j => j.wif = this.wifs[<any>i.address]));
        bchBalances.forEach(a => a.result.nonSlpUtxos.forEach(txo => utxos.push(txo)));
        return await this.network.simpleTokenSend(tokenId, Array(this.addresses.length).fill(totalToken.dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0]);
    }
    
    async evenlyDistributeBch(): Promise<string> {
        // TODO: use a threshold to determine if split should be made

        // spread the bch across all of the addresses
        let utxos: slpjs.SlpAddressUtxoResult[] = [];
        let balances = ((await this.network.getAllSlpBalancesAndUtxos(this.addresses)) as R[]);
        let bchBalances = balances.filter(i => i.result.nonSlpUtxos.length > 0);
        let totalBch = bchBalances.reduce((t, v) => t = t.plus(v.result.satoshis_available_bch), new BigNumber(0));
        let sendCost = this.network.slp.calculateSendCost(0, utxos.length, this.addresses.length, this.addresses[0]);
        bchBalances.map(i => i.result.nonSlpUtxos.forEach(j => j.wif = this.wifs[<any>i.address]));
        bchBalances.forEach(a => a.result.nonSlpUtxos.forEach(txo => utxos.push(txo)));
        return await this.network.simpleBchSend(Array(this.addresses.length).fill(totalBch.minus(sendCost).dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0]);
    }

    async selectFaucetAddress() {
        let a = await this.network.BITBOX.Address.details(this.addresses);
        console.log("DETAILS", a);
        for(let i = 0; i < this.addresses.length; i++) {
            if(a[i].unconfirmedBalanceSat === 0)
                return this.addresses[i];
        }
    }
}

interface R { address: string, result: slpjs.SlpBalancesResult }
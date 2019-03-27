import BITBOXSDK from 'bitbox-sdk/lib/bitbox-sdk';
let BITBOX: BITBOXSDK;
let NETWORK = 'mainnet';
if (NETWORK === `mainnet`)
    BITBOX = new BITBOXSDK({ restURL: `https://rest.bitcoin.com/v2/` });
else BITBOX = new BITBOXSDK({ restURL: `https://trest.bitcoin.com/v2/` });
import * as slpjs from 'slpjs';
import BigNumber from 'bignumber.js';
import { Utils } from 'slpjs';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const getRawTransactions = async function(txids: string[]) {
	let res = await BITBOX.RawTransactions.getRawTransaction(txids);
	await sleep(1000);
	return res;
}

export class CoinSplitter {
    addresses: string[];
    wifs: { [key: string]: string }
    validator: slpjs.LocalValidator;
    network: slpjs.BitboxNetwork;

    constructor(mnemonic: string) {
        let masterNode = BITBOX.HDNode.fromSeed(BITBOX.Mnemonic.toSeed(mnemonic!)).derivePath("m/44'/245'/0'");
        this.addresses = [];
        this.wifs = {};
        for(let i = 0; i < 18; i++) {
            let childNode = masterNode.derivePath("0/" + i);
            let address = slpjs.Utils.toSlpAddress(BITBOX.ECPair.toCashAddress(BITBOX.ECPair.fromWIF(BITBOX.HDNode.toWIF(childNode))))
            this.wifs[address] = BITBOX.HDNode.toWIF(childNode);
            this.addresses.push(address);
        }
        this.validator = new slpjs.LocalValidator(BITBOX, getRawTransactions);

        this.network = new slpjs.BitboxNetwork(BITBOX, this.validator);
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

    async selectFaucetAddressForTokens(tokenId: string): Promise<{ address: string, balance: slpjs.SlpBalancesResult }> {
        let a = await this.network.BITBOX.Address.details(this.addresses.map(a => { return Utils.toCashAddress(a); }));
        //console.log("DETAILS", a);
        for(let i = 0; i < this.addresses.length; i++) {
            if(a[i].unconfirmedBalanceSat === 0 && a[i].balanceSat > 0) {
                console.log("details address:", a[i].cashAddress);
                console.log("addresses check:", Utils.toCashAddress(this.addresses[i]));
                console.log("UnconfirmedBalanceSat:", a[i].unconfirmedBalanceSat);
                console.log("balanceSat:", a[i].balanceSat);
                let b = (await this.network.getAllSlpBalancesAndUtxos(this.addresses[i]) as slpjs.SlpBalancesResult);
                try {
                    console.log("Token input amount: ", b.slpTokenBalances[tokenId].toNumber());
                    if(b.slpTokenBalances[tokenId].isGreaterThan(0) === true)
                        return { address: this.addresses[i], balance: b };
                } catch(_) { }
            }
        }
        throw Error("There are no addresses with sufficient balance")
    }
}

interface R { address: string, result: slpjs.SlpBalancesResult }
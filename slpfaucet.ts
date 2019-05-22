import { BITBOX } from 'bitbox-sdk';
let bitbox: BITBOX;
let NETWORK = 'mainnet';
if (NETWORK === `mainnet`)
    bitbox = new BITBOX({ restURL: `https://rest.bitcoin.com/v2/` });
else bitbox = new BITBOX({ restURL: `https://trest.bitcoin.com/v2/` });
import { AddressDetailsResult } from 'bitcoin-com-rest';

import * as slpjs from 'slpjs';
import BigNumber from 'bignumber.js';
import { Utils } from 'slpjs';

export class SlpFaucetHandler {
    addresses: string[];
    wifs: { [key: string]: string }
    network: slpjs.BitboxNetwork;
    currentFaucetAddressIndex = 0;

    constructor(mnemonic: string) {
        let masterNode = bitbox.HDNode.fromSeed(bitbox.Mnemonic.toSeed(mnemonic!)).derivePath("m/44'/245'/0'");
        this.addresses = [];
        this.wifs = {};
        for(let i = 0; i < 18; i++) {
            let childNode = masterNode.derivePath("0/" + i);
            let address = slpjs.Utils.toSlpAddress(bitbox.ECPair.toCashAddress(bitbox.ECPair.fromWIF(bitbox.HDNode.toWIF(childNode))))
            this.wifs[address] = bitbox.HDNode.toWIF(childNode);
            this.addresses.push(address);
        }

        this.network = new slpjs.BitboxNetwork(bitbox);
    }

    async evenlyDistributeTokens(tokenId: string): Promise<string> {
        // TODO: use a threshold to determine if split should be made automatically

        if(this.addresses.length > 19)
            throw Error("Cannot split token to more than 19 addresses");
        
        let utxos: slpjs.SlpAddressUtxoResult[] = [];
        let balances = ((await this.network.getAllSlpBalancesAndUtxos(this.addresses)) as R[])

        // add input token UTXOs 
        let tokenBalances = balances.filter(i => { try { return i.result.slpTokenBalances[tokenId].isGreaterThan(0) } catch(_){ return false; }});
        tokenBalances.map<void>(i => i.result.slpTokenUtxos[tokenId].forEach(j => j.wif = this.wifs[<any>i.address]));
        tokenBalances.forEach(a => { try { a.result.slpTokenUtxos[tokenId].forEach(txo => utxos.push(txo)); } catch(_){ }});

        // add input BCH (non-token) UTXOs 
        let bchBalances = balances.filter(i => i.result.nonSlpUtxos.length > 0);
        bchBalances.map(i => i.result.nonSlpUtxos.forEach(j => j.wif = this.wifs[<any>i.address]));
        bchBalances.forEach(a => a.result.nonSlpUtxos.forEach(txo => utxos.push(txo)));

        let totalToken: BigNumber = tokenBalances.reduce((t, v) => t = t.plus(v.result.slpTokenBalances[tokenId]), new BigNumber(0));
        console.log("total token amount to distribute:", totalToken.toFixed())
        console.log("spread amount", totalToken.dividedToIntegerBy(this.addresses.length).toFixed());
        return await this.network.simpleTokenSend(tokenId, Array(this.addresses.length).fill(totalToken.dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0]);
    }
    
    async evenlyDistributeBch(): Promise<string> {
        // TODO: use a threshold to determine if split should be made automatically

        // spread the bch across all of the addresses
        let utxos: slpjs.SlpAddressUtxoResult[] = [];
        let balances = ((await this.network.getAllSlpBalancesAndUtxos(this.addresses)) as R[]);

        // add input BCH (non-token) UTXOs 
        let bchBalances = balances.filter(i => i.result.nonSlpUtxos.length > 0);
        bchBalances.map(i => i.result.nonSlpUtxos.forEach(j => j.wif = this.wifs[<any>i.address]));
        bchBalances.forEach(a => a.result.nonSlpUtxos.forEach(txo => utxos.push(txo)));

        let totalBch = bchBalances.reduce((t, v) => t = t.plus(v.result.satoshis_available_bch), new BigNumber(0));
        let sendCost = this.network.slp.calculateSendCost(0, utxos.length, this.addresses.length, this.addresses[0], 1, false); // rough overestimate
        console.log("estimated send cost:", sendCost);
        console.log("total BCH to distribute:", totalBch.toFixed());
        console.log("spread amount:", totalBch.minus(sendCost).dividedToIntegerBy(this.addresses.length+1).toFixed());

        return await this.network.simpleBchSend(Array(this.addresses.length).fill(totalBch.minus(sendCost).dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0]);
    }

    async selectFaucetAddressForTokens(tokenId: string): Promise<{ address: string, balance: slpjs.SlpBalancesResult }> {
        let addresses = this.addresses.filter((a, i) => i >= this.currentFaucetAddressIndex).map(a => { return Utils.toCashAddress(a); });
        let a = <AddressDetailsResult[]>await this.network.BITBOX.Address.details(addresses);
        for(let i = 0; i < addresses.length; i++) {
            if(a[i].unconfirmedTxApperances < 25) {
                console.log("-----------------------------------");
                console.log("Address Index: ", this.currentFaucetAddressIndex);
                console.log("slp address:", Utils.toSlpAddress(a[i].cashAddress));
                console.log("cash address:", Utils.toCashAddress(addresses[i]));
                console.log("unconfirmedBalanceSat:", a[i].unconfirmedBalanceSat);
                console.log("balanceSat (includes token satoshis):", a[i].balanceSat);
                console.log("Processing this address' UTXOs with SLP validator...");
                let b = (await this.network.getAllSlpBalancesAndUtxos(addresses[i]) as slpjs.SlpBalancesResult);
                let sendCost = this.network.slp.calculateSendCost(60, b.nonSlpUtxos.length + b.slpTokenUtxos[tokenId].length, 3, addresses[0]) - 546;
                console.log("Token input quantity: ", b.slpTokenBalances[tokenId].toFixed());
                console.log("BCH (satoshis_available_bch):", b.satoshis_available_bch);
                console.log("Estimated send cost (satoshis):", sendCost);
                if(b.slpTokenBalances[tokenId].isGreaterThan(0) === true && b.satoshis_available_bch > sendCost) {
                    console.log("Using address index:", this.currentFaucetAddressIndex);
                    console.log("-----------------------------------");
                    return { address: Utils.toSlpAddress(addresses[i]), balance: b };
                }
                console.log("Address index", this.currentFaucetAddressIndex, "has insufficient BCH to fuel token transaction, trying the next index.");
                console.log("-----------------------------------");
                this.currentFaucetAddressIndex++;
            }
        }
        throw Error("There are no addresses with sufficient balance")
    }
}

interface R { address: string, result: slpjs.SlpBalancesResult }
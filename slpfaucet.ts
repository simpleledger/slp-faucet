import BigNumber from "bignumber.js";
import { BITBOX } from "bitbox-sdk";
import { GrpcClient } from "grpc-bchrpc-node";
import * as slpjs from "slpjs";
import { BchdNetwork, BchdValidator, Utils } from "slpjs";

const bitbox = new BITBOX();
const client = new GrpcClient({url: "bchd.ny1.simpleledger.io" });
const validator = new BchdValidator(client, console);

export class SlpFaucetHandler {
    public addresses: string[];
    public wifs: { [key: string]: string };
    public network: BchdNetwork;
    public currentFaucetAddressIndex = 0;

    private unconfirmedChainLength = new Map<string, number>();
    private blockHeight = 0;

    constructor(mnemonic: string) {
        const masterNode = bitbox.HDNode.fromSeed(bitbox.Mnemonic.toSeed(mnemonic!)).derivePath("m/44'/245'/0'");
        this.addresses = [];
        this.wifs = {};
        for (let i = 0; i < 18; i++) {
            const childNode = masterNode.derivePath("0/" + i);
            const address = Utils.toSlpAddress(bitbox.ECPair.toCashAddress(bitbox.ECPair.fromWIF(bitbox.HDNode.toWIF(childNode))));
            this.wifs[address] = bitbox.HDNode.toWIF(childNode);
            this.addresses.push(address);
            this.unconfirmedChainLength.set(address, 0);
        }
        this.network = new BchdNetwork({ BITBOX: bitbox, validator, logger: console, client: validator.client });
    }

    get currentAddress() {
        return this.addresses[this.currentFaucetAddressIndex];
    }

    public async evenlyDistributeTokens(tokenId: string): Promise<string> {
        // TODO: use a threshold to determine if split should be made automatically

        if (this.addresses.length > 19) {
            throw Error("Cannot split token to more than 19 addresses");
        }

        const utxos: slpjs.SlpAddressUtxoResult[] = [];
        const balances = ((await this.network.getAllSlpBalancesAndUtxos(this.addresses)) as R[]);

        // add input token UTXOs
        const tokenBalances = balances.filter((i) => {
            try {
                return i.result.slpTokenBalances[tokenId].isGreaterThan(0);
            } catch (_) {
                return false;
            }
        });
        tokenBalances.map<void>((i) =>
            i.result.slpTokenUtxos[tokenId].forEach((j) => j.wif = this.wifs[ i.address as any]));
        tokenBalances.forEach((a) => {
            try {
                a.result.slpTokenUtxos[tokenId].forEach((txo) => utxos.push(txo));
            } catch (_) { }
        });

        if (tokenBalances.length === 0) {
            throw Error("Token balance in faucet wallet is 0.");
        }

        // add input BCH (non-token) UTXOs
        const bchBalances = balances.filter((i) => i.result.nonSlpUtxos.length > 0);
        bchBalances.map((i) => i.result.nonSlpUtxos.forEach((j) => j.wif = this.wifs[ i.address as any]));
        bchBalances.forEach((a) => a.result.nonSlpUtxos.forEach((txo) => utxos.push(txo)));

        if (bchBalances.length === 0) {
            throw Error("BCH balance in faucet wallet is 0.");
        }

        const totalToken: BigNumber = tokenBalances.reduce((t, v) => t = t.plus(v.result.slpTokenBalances[tokenId]), new BigNumber(0));
        console.log("total token amount to distribute:", totalToken.toFixed());
        console.log("spread amount", totalToken.dividedToIntegerBy(this.addresses.length).toFixed());
        await this.increaseChainLength();
        return await this.network.simpleTokenSend(tokenId, Array(this.addresses.length).fill(totalToken.dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0]);
    }

    public async evenlyDistributeBch(): Promise<string> {
        // TODO: use a threshold to determine if split should be made automatically

        // spread the bch across all of the addresses
        const utxos: slpjs.SlpAddressUtxoResult[] = [];
        const balances = ((await this.network.getAllSlpBalancesAndUtxos(this.addresses)) as R[]);

        // add input BCH (non-token) UTXOs
        const bchBalances = balances.filter((i) => i.result.nonSlpUtxos.length > 0);
        bchBalances.map((i) => i.result.nonSlpUtxos.forEach((j) => j.wif = this.wifs[ i.address as any]));
        bchBalances.forEach((a) => a.result.nonSlpUtxos.forEach((txo) => utxos.push(txo)));

        if (bchBalances.length === 0) {
            throw Error("BCH balance in faucet wallet is 0.");
        }

        const totalBch = bchBalances.reduce((t, v) => t = t.plus(v.result.satoshis_available_bch), new BigNumber(0));
        const sendCost = this.network.slp.calculateSendCost(0, utxos.length, this.addresses.length, this.addresses[0], 1, false); // rough overestimate
        console.log("estimated send cost:", sendCost);
        console.log("total BCH to distribute:", totalBch.toFixed());
        console.log("spread amount:", totalBch.minus(sendCost).dividedToIntegerBy(this.addresses.length).toFixed());
        await this.increaseChainLength();
        return await this.network.simpleBchSend(Array(this.addresses.length).fill(totalBch.minus(sendCost).dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0]);
    }

    public async selectFaucetAddressForTokens(tokenId: string): Promise<{ address: string, balance: slpjs.SlpBalancesResult }> {
        const addresses = this.addresses.filter((_, i) => i >= this.currentFaucetAddressIndex).map((a) => Utils.toCashAddress(a));
        for (let i = 0; i < addresses.length; i++) {
            if (this.unconfirmedChainLength.get(this.addresses[i])! > 49) {
                continue;
            }

            const bals = (await this.network.getAllSlpBalancesAndUtxos(addresses[i]) as slpjs.SlpBalancesResult);
            if (bals.nonSlpUtxos.length === 0 || !bals.slpTokenUtxos[tokenId]) {
                continue;
            }

            console.log("-----------------------------------");
            console.log("Address Index: ", this.currentFaucetAddressIndex);

            console.log(`Unconfirmed chain length: ${this.unconfirmedChainLength.get(this.currentAddress)}`);

            // console.log("slp address:", Utils.toSlpAddress(a[i].cashAddress));
            console.log("cash address:", Utils.toCashAddress(addresses[i]));
            // console.log("unconfirmed balanceSat (includes tokens):", a[i].unconfirmedBalanceSat);
            // console.log("confirmed balanceSat (includes tokens):", a[i].balanceSat);
            console.log("Processing this address' UTXOs with SLP validator...");
            const sendCost = this.network.slp.calculateSendCost(60, bals.nonSlpUtxos.length + bals.slpTokenUtxos[tokenId].length, 3, addresses[0]) - 546;
            console.log("Token input quantity: ", bals.slpTokenBalances[tokenId].toFixed());
            console.log("BCH (satoshis_available_bch):", bals.satoshis_available_bch);
            console.log("Estimated send cost (satoshis):", sendCost);
            if (bals.slpTokenBalances[tokenId].isGreaterThan(0) === true && bals.satoshis_available_bch > sendCost) {
                console.log("Using address index:", this.currentFaucetAddressIndex);
                console.log("-----------------------------------");
                return { address: Utils.toSlpAddress(addresses[i]), balance: bals };
            }
            console.log("Address index", this.currentFaucetAddressIndex, "has insufficient BCH to fuel token transaction, trying the next index.");
            console.log("-----------------------------------");
            this.currentFaucetAddressIndex++;
        }
        throw Error("There are no addresses with sufficient balance");
    }

    public async simpleTokenSend(tokenId: string, sendAmount: BigNumber, inputUtxos: slpjs.SlpAddressUtxoResult[], tokenReceiverAddresses: string | string[], changeReceiverAddress: string): Promise<string> {
        await this.increaseChainLength();
        return await this.network.simpleTokenSend(tokenId, sendAmount, inputUtxos, tokenReceiverAddresses, changeReceiverAddress);
    }

    private async increaseChainLength() {
        const height = (await client.getBlockchainInfo()).getBestHeight();
        if (height !== this.blockHeight) {
            this.blockHeight = height;
            this.unconfirmedChainLength.forEach((_, addr) => this.unconfirmedChainLength.set(addr, 0));
        }
        const len = this.unconfirmedChainLength.get(this.currentAddress)!;
        this.unconfirmedChainLength.set(this.currentAddress, len + 1);
    }
}

interface R { address: string; result: slpjs.SlpBalancesResult; }

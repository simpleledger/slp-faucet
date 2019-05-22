"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var bitbox_sdk_1 = require("bitbox-sdk");
var bitbox;
var NETWORK = 'mainnet';
if (NETWORK === "mainnet")
    bitbox = new bitbox_sdk_1.BITBOX({ restURL: "https://rest.bitcoin.com/v2/" });
else
    bitbox = new bitbox_sdk_1.BITBOX({ restURL: "https://trest.bitcoin.com/v2/" });
var slpjs = require("slpjs");
var bignumber_js_1 = require("bignumber.js");
var slpjs_1 = require("slpjs");
var SlpFaucetHandler = /** @class */ (function () {
    function SlpFaucetHandler(mnemonic) {
        this.currentFaucetAddressIndex = 0;
        var masterNode = bitbox.HDNode.fromSeed(bitbox.Mnemonic.toSeed(mnemonic)).derivePath("m/44'/245'/0'");
        this.addresses = [];
        this.wifs = {};
        for (var i = 0; i < 18; i++) {
            var childNode = masterNode.derivePath("0/" + i);
            var address = slpjs.Utils.toSlpAddress(bitbox.ECPair.toCashAddress(bitbox.ECPair.fromWIF(bitbox.HDNode.toWIF(childNode))));
            this.wifs[address] = bitbox.HDNode.toWIF(childNode);
            this.addresses.push(address);
        }
        this.network = new slpjs.BitboxNetwork(bitbox);
    }
    SlpFaucetHandler.prototype.evenlyDistributeTokens = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var utxos, balances, tokenBalances, bchBalances, totalToken;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // TODO: use a threshold to determine if split should be made automatically
                        if (this.addresses.length > 19)
                            throw Error("Cannot split token to more than 19 addresses");
                        utxos = [];
                        return [4 /*yield*/, this.network.getAllSlpBalancesAndUtxos(this.addresses)];
                    case 1:
                        balances = (_a.sent());
                        tokenBalances = balances.filter(function (i) { try {
                            return i.result.slpTokenBalances[tokenId].isGreaterThan(0);
                        }
                        catch (_) {
                            return false;
                        } });
                        tokenBalances.map(function (i) { return i.result.slpTokenUtxos[tokenId].forEach(function (j) { return j.wif = _this.wifs[i.address]; }); });
                        tokenBalances.forEach(function (a) { try {
                            a.result.slpTokenUtxos[tokenId].forEach(function (txo) { return utxos.push(txo); });
                        }
                        catch (_) { } });
                        bchBalances = balances.filter(function (i) { return i.result.nonSlpUtxos.length > 0; });
                        bchBalances.map(function (i) { return i.result.nonSlpUtxos.forEach(function (j) { return j.wif = _this.wifs[i.address]; }); });
                        bchBalances.forEach(function (a) { return a.result.nonSlpUtxos.forEach(function (txo) { return utxos.push(txo); }); });
                        totalToken = tokenBalances.reduce(function (t, v) { return t = t.plus(v.result.slpTokenBalances[tokenId]); }, new bignumber_js_1.default(0));
                        console.log("total token amount to distribute:", totalToken.toFixed());
                        console.log("spread amount", totalToken.dividedToIntegerBy(this.addresses.length).toFixed());
                        return [4 /*yield*/, this.network.simpleTokenSend(tokenId, Array(this.addresses.length).fill(totalToken.dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    SlpFaucetHandler.prototype.evenlyDistributeBch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var utxos, balances, bchBalances, totalBch, sendCost;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        utxos = [];
                        return [4 /*yield*/, this.network.getAllSlpBalancesAndUtxos(this.addresses)];
                    case 1:
                        balances = (_a.sent());
                        bchBalances = balances.filter(function (i) { return i.result.nonSlpUtxos.length > 0; });
                        bchBalances.map(function (i) { return i.result.nonSlpUtxos.forEach(function (j) { return j.wif = _this.wifs[i.address]; }); });
                        bchBalances.forEach(function (a) { return a.result.nonSlpUtxos.forEach(function (txo) { return utxos.push(txo); }); });
                        totalBch = bchBalances.reduce(function (t, v) { return t = t.plus(v.result.satoshis_available_bch); }, new bignumber_js_1.default(0));
                        sendCost = this.network.slp.calculateSendCost(0, utxos.length, this.addresses.length, this.addresses[0], 1, false);
                        console.log("estimated send cost:", sendCost);
                        console.log("total BCH to distribute:", totalBch.toFixed());
                        console.log("spread amount:", totalBch.minus(sendCost).dividedToIntegerBy(this.addresses.length + 1).toFixed());
                        return [4 /*yield*/, this.network.simpleBchSend(Array(this.addresses.length).fill(totalBch.minus(sendCost).dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    SlpFaucetHandler.prototype.selectFaucetAddressForTokens = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var addresses, a, i, b, sendCost;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        addresses = this.addresses.filter(function (a, i) { return i >= _this.currentFaucetAddressIndex; }).map(function (a) { return slpjs_1.Utils.toCashAddress(a); });
                        return [4 /*yield*/, this.network.BITBOX.Address.details(addresses)];
                    case 1:
                        a = _a.sent();
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < addresses.length)) return [3 /*break*/, 5];
                        if (!(a[i].unconfirmedTxApperances < 25)) return [3 /*break*/, 4];
                        console.log("-----------------------------------");
                        console.log("Address Index: ", this.currentFaucetAddressIndex);
                        console.log("slp address:", slpjs_1.Utils.toSlpAddress(a[i].cashAddress));
                        console.log("cash address:", slpjs_1.Utils.toCashAddress(addresses[i]));
                        console.log("unconfirmedBalanceSat:", a[i].unconfirmedBalanceSat);
                        console.log("balanceSat (includes token satoshis):", a[i].balanceSat);
                        console.log("Processing this address' UTXOs with SLP validator...");
                        return [4 /*yield*/, this.network.getAllSlpBalancesAndUtxos(addresses[i])];
                    case 3:
                        b = _a.sent();
                        sendCost = this.network.slp.calculateSendCost(60, b.nonSlpUtxos.length + b.slpTokenUtxos[tokenId].length, 3, addresses[0]) - 546;
                        console.log("Token input quantity: ", b.slpTokenBalances[tokenId].toFixed());
                        console.log("BCH (satoshis_available_bch):", b.satoshis_available_bch);
                        console.log("Estimated send cost (satoshis):", sendCost);
                        if (b.slpTokenBalances[tokenId].isGreaterThan(0) === true && b.satoshis_available_bch > sendCost) {
                            console.log("Using address index:", this.currentFaucetAddressIndex);
                            console.log("-----------------------------------");
                            return [2 /*return*/, { address: slpjs_1.Utils.toSlpAddress(addresses[i]), balance: b }];
                        }
                        console.log("Address index", this.currentFaucetAddressIndex, "has insufficient BCH to fuel token transaction, trying the next index.");
                        console.log("-----------------------------------");
                        this.currentFaucetAddressIndex++;
                        _a.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: throw Error("There are no addresses with sufficient balance");
                }
            });
        });
    };
    return SlpFaucetHandler;
}());
exports.SlpFaucetHandler = SlpFaucetHandler;
//# sourceMappingURL=slpfaucet.js.map
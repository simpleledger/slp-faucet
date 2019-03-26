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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var SLPSDK = require("slp-sdk/lib/SLP");
var SLP;
var NETWORK = 'mainnet';
if (NETWORK === "mainnet")
    SLP = new SLPSDK({ restURL: "https://rest.bitcoin.com/v2/" });
else
    SLP = new SLPSDK({ restURL: "https://trest.bitcoin.com/v2/" });
var slpjs = __importStar(require("slpjs"));
var bignumber_js_1 = __importDefault(require("bignumber.js"));
var sleep = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
var getRawTransactions = function (txids) {
    return __awaiter(this, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, SLP.RawTransactions.getRawTransaction(txids)];
                case 1:
                    res = _a.sent();
                    return [4 /*yield*/, sleep(1000)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, res];
            }
        });
    });
};
var CoinSplitter = /** @class */ (function () {
    function CoinSplitter(mnemonic) {
        var masterNode = SLP.HDNode.fromSeed(SLP.Mnemonic.toSeed(mnemonic)).derivePath("m/44'/245'/0'");
        this.addresses = [];
        this.wifs = {};
        for (var i = 0; i < 18; i++) {
            var childNode = masterNode.derivePath("0/" + i);
            var address = slpjs.Utils.toSlpAddress(SLP.ECPair.toCashAddress(SLP.ECPair.fromWIF(SLP.HDNode.toWIF(childNode))));
            this.wifs[address] = SLP.HDNode.toWIF(childNode);
            this.addresses.push(address);
        }
        this.validator = new slpjs.LocalValidator(SLP, getRawTransactions);
        this.network = new slpjs.BitboxNetwork(SLP, this.validator);
    }
    CoinSplitter.prototype.evenlyDistributeTokens = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var balances, utxos, tokenBalances, totalToken, bchBalances;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // TODO: use a threshold to determine if split should be made
                        if (this.addresses.length > 19)
                            throw Error("Cannot split token to more than 19 addresses");
                        return [4 /*yield*/, this.network.getAllSlpBalancesAndUtxos(this.addresses)];
                    case 1:
                        balances = (_a.sent());
                        utxos = [];
                        tokenBalances = balances.filter(function (i) { try {
                            return i.result.slpTokenBalances[tokenId].isGreaterThan(0);
                        }
                        catch (_) {
                            return false;
                        } });
                        tokenBalances.map(function (i) { return i.result.slpTokenUtxos[tokenId].forEach(function (j) { return j.wif = _this.wifs[i.address]; }); });
                        tokenBalances.forEach(function (a) { return Object.keys(a.result.slpTokenUtxos).forEach(function (id) { return a.result.slpTokenUtxos[id].forEach(function (txo) { return utxos.push(txo); }); }); });
                        totalToken = tokenBalances.reduce(function (t, v) { return t = t.plus(v.result.slpTokenBalances[tokenId]); }, new bignumber_js_1.default(0));
                        bchBalances = balances.filter(function (i) { return i.result.nonSlpUtxos.length > 0; });
                        bchBalances.map(function (i) { return i.result.nonSlpUtxos.forEach(function (j) { return j.wif = _this.wifs[i.address]; }); });
                        bchBalances.forEach(function (a) { return a.result.nonSlpUtxos.forEach(function (txo) { return utxos.push(txo); }); });
                        return [4 /*yield*/, this.network.simpleTokenSend(tokenId, Array(this.addresses.length).fill(totalToken.dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    CoinSplitter.prototype.evenlyDistributeBch = function () {
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
                        totalBch = bchBalances.reduce(function (t, v) { return t = t.plus(v.result.satoshis_available_bch); }, new bignumber_js_1.default(0));
                        sendCost = this.network.slp.calculateSendCost(0, utxos.length, this.addresses.length, this.addresses[0]);
                        bchBalances.map(function (i) { return i.result.nonSlpUtxos.forEach(function (j) { return j.wif = _this.wifs[i.address]; }); });
                        bchBalances.forEach(function (a) { return a.result.nonSlpUtxos.forEach(function (txo) { return utxos.push(txo); }); });
                        return [4 /*yield*/, this.network.simpleBchSend(Array(this.addresses.length).fill(totalBch.minus(sendCost).dividedToIntegerBy(this.addresses.length)), utxos, this.addresses, this.addresses[0])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    CoinSplitter.prototype.selectFaucetAddress = function () {
        return __awaiter(this, void 0, void 0, function () {
            var a, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.network.BITBOX.Address.details(this.addresses)];
                    case 1:
                        a = _a.sent();
                        console.log("DETAILS", a);
                        for (i = 0; i < this.addresses.length; i++) {
                            if (a[i].unconfirmedBalanceSat === 0)
                                return [2 /*return*/, this.addresses[i]];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return CoinSplitter;
}());
exports.CoinSplitter = CoinSplitter;
//# sourceMappingURL=coinsplitter.js.map
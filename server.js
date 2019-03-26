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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var SLPSDK = require("slp-sdk/lib/SLP");
var SLP;
var NETWORK = 'mainnet';
if (NETWORK === "mainnet")
    SLP = new SLPSDK({ restURL: "https://rest.bitcoin.com/v2/" });
else
    SLP = new SLPSDK({ restURL: "https://trest.bitcoin.com/v2/" });
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var express_1 = __importDefault(require("express"));
var body_parser_1 = __importDefault(require("body-parser"));
var app = express_1.default();
var slpjs = __importStar(require("slpjs"));
var coinsplitter_1 = require("./coinsplitter");
var splitter = new coinsplitter_1.CoinSplitter(process.env.MNEMONIC);
var faucetQty = parseInt(process.env.TOKENQTY);
app.use(express_1.default.static('public'));
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
    res.render('index', { txid: null, error: null });
});
app.get('/distribute', function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // TODO: Check if re-distribution is needed
                return [4 /*yield*/, splitter.evenlyDistributeTokens(process.env.TOKENID)];
                case 1:
                    // TODO: Check if re-distribution is needed
                    _a.sent();
                    return [4 /*yield*/, splitter.evenlyDistributeBch()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
});
app.post('/', function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var address, changeAddr, slpConfig, sendTxId, error_1, re;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    address = req.body.address;
                    try {
                        if (!slpjs.Utils.isSlpAddress(address)) {
                            res.render('index', { txid: null, error: "Not a SLP Address." });
                            return [2 /*return*/];
                        }
                    }
                    catch (error) {
                        res.render('index', { txid: null, error: "Not a SLP Address." });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, splitter.selectFaucetAddress()];
                case 1:
                    changeAddr = _a.sent();
                    slpConfig = {
                        fundingAddress: changeAddr,
                        fundingWif: splitter.wifs[changeAddr],
                        tokenReceiverAddress: address,
                        bchChangeReceiverAddress: changeAddr,
                        tokenId: process.env.TOKENID,
                        amount: faucetQty
                    };
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, SLP.TokenType1.send(slpConfig)];
                case 3:
                    // @ts-ignore
                    sendTxId = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.log(error_1);
                    res.render('index', { txid: null, error: "Server error." });
                    return [2 /*return*/];
                case 5:
                    console.log(sendTxId);
                    re = /^([A-Fa-f0-9]{2}){32,32}$/;
                    if (typeof sendTxId !== 'string' || !re.test(sendTxId)) {
                        res.render('index', { txid: null, error: sendTxId });
                        return [2 /*return*/];
                    }
                    res.render('index', { txid: sendTxId, error: null });
                    return [2 /*return*/];
            }
        });
    });
});
app.listen(process.env.PORT, function () {
    console.log('Example app listening on port ' + process.env.PORT + '!');
});
//# sourceMappingURL=server.js.map
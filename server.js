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
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var express_1 = __importDefault(require("express"));
var body_parser_1 = __importDefault(require("body-parser"));
var app = express_1.default();
var slpjs = __importStar(require("slpjs"));
var slpfaucet_1 = require("./slpfaucet");
var bignumber_js_1 = __importDefault(require("bignumber.js"));
var sleep = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
var slpFaucet = new slpfaucet_1.SlpFaucetHandler(process.env.MNEMONIC);
var faucetQty = parseInt(process.env.TOKENQTY);
app.use(express_1.default.static('public'));
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
    res.render('index', { txid: null, error: null });
});
app.post('/', function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var address, changeAddr, error_1, sendTxId, inputs, error_2, re;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    address = req.body.address;
                    if (!(address === process.env.DISTRIBUTE_SECRET)) return [3 /*break*/, 4];
                    res.render('index', { txid: null, error: "Token distribution instantiated, please wait 30 seconds..." });
                    return [4 /*yield*/, slpFaucet.evenlyDistributeTokens(process.env.TOKENID)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, sleep(5000)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, slpFaucet.evenlyDistributeBch()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
                case 4:
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
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, slpFaucet.selectFaucetAddressForTokens(process.env.TOKENID)];
                case 6:
                    changeAddr = _a.sent();
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    res.render('index', { txid: null, error: "Faucet is temporarily empty :(" });
                    return [2 /*return*/];
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    inputs = [];
                    inputs = inputs.concat(changeAddr.balance.slpTokenUtxos[process.env.TOKENID]).concat(changeAddr.balance.nonSlpUtxos);
                    inputs.map(function (i) { return i.wif = slpFaucet.wifs[changeAddr.address]; });
                    return [4 /*yield*/, slpFaucet.network.simpleTokenSend(process.env.TOKENID, new bignumber_js_1.default(faucetQty), inputs, address, changeAddr.address)];
                case 9:
                    sendTxId = _a.sent();
                    return [3 /*break*/, 11];
                case 10:
                    error_2 = _a.sent();
                    console.log(error_2);
                    res.render('index', { txid: null, error: "Server error." });
                    return [2 /*return*/];
                case 11:
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
    console.log('SLP faucet server listening on port ' + process.env.PORT + '!');
});
//# sourceMappingURL=server.js.map
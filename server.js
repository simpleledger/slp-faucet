const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const bodyParser = require('body-parser');
const app = express()
const SLPSDK = require("slp-sdk/lib/SLP");
let SLP;
let NETWORK = 'mainnet';
if (NETWORK === `mainnet`)
  SLP = new SLPSDK({ restURL: `https://rest.bitcoin.com/v2/` })
else SLP = new SLPSDK({ restURL: `https://trest.bitcoin.com/v2/` })
let slpjs = require('slpjs');

const wif = process.env.WIF;
const tokenId = process.env.TOKENID;
const tokenQty = parseInt(process.env.TOKENQTY);
const changeAddr = SLP.Address.toSLPAddress(SLP.ECPair.toCashAddress(SLP.ECPair.fromWIF(wif)));

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('index', { txid: null, error: null });
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
 
  const slpConfig = {
    fundingAddress: changeAddr,
    fundingWif: wif,
    tokenReceiverAddress: address,
    bchChangeReceiverAddress: changeAddr,
    tokenId: tokenId,
    amount: tokenQty
  }
  let sendTxId;
  try {
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

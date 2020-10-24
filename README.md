# SLP Faucet Example

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/simpleledger/slp-faucet)

This project is an example of an SLP faucet website.  Users can enter their SLP address and the server will send the token quantity specified within the environment variables (i.e., per `TOKENQTY` and `TOKENID`) to the user's address.

## Faucet Capacity

This faucet can service 900 transactions per block (i.e., 50 txn limit/block x 18 addresses = 900).  The faucet admin can automatically distribute tokens and the BCH (for paying transaction fees) evenly across the first 18 addresses located at the `m/44'/245'/0'/0/X` HD path, where `X` is an address index in the range 0 to 17.  The admin can initiate this distribution by entering the `DISTRIBUTE_SECRET` environment variable into the site's address input field.

NOTE: You will need to wait 1 block confirmation after distribution step before the faucet will be able to be used.  This is because address selection is based on finding the first address with a unconfirmed balance of 0 BCH.

## Setup

* Use Electron Cash SLP or other SLP wallet to store faucet token & BCH coins, then use the mnemonic for that wallet for the faucet in the `MNEMONIC` environmental variable.

* Create a new `.env` file with the following environment variables:
```
MNEMONIC=______
TOKENID=_______
TOKENQTY=______
DISTRIBUTE_SECRET=______
PORT=______
```

## Run the web app locally:

```
$ npm i
$ node server.js
```

## Build Source

If you want to modify the source (i.e., the `*.ts` files), you will need to rebuild using `tsc` before running the app.  TypeScript needs to be installed globally via `npm install -g typescript`.

# SLP Faucet Example

This project is an example of an SLP faucet website.  The site allows users to enter their SLP address and the server-side process will send the user's address the quantity of the token ID specified within the environment variables `TOKENQTY` and `TOKENID`.  The program allows the website admin to automatically distribute the tokens and BCH evenly across the first 18 addresses of the `m/44'/245'/0'/0/X` path, where `X` is the address indecies 0 to 17.  The admin can instantiate this automatic distribution by entering the `DISTRIBUTE_SECRET` environment variable into the address input field.

## Setup

* Use Electron Cash SLP or other SLP wallet to store faucet token & BCH coins, then use the mnemonic for that wallet for the faucet in the `MNEMONIC` environmental variable.

* Create a new `.env` file with the following environment variables:
    `MNEMONIC=______`
    `TOKENID=_______`
    `TOKENQTY=______`
    `DISTRIBUTE_SECRET=______`

## Run the web app locally:

```
npm install
node server.js
```

## Build Source

If you want to modify the source (i.e., the `*.ts` files), you will need to rebuild using `tsc` before running the app.  TypeScript needs to be installed globally via `npm install -g typescript`.

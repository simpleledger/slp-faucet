# simplest-slp-faucet
Simplest Node.js SLP Faucet

* Use Electron Cash SLP or other SLP wallet to store faucet supply, then export a single private key holding the tokens.

* Create a new `.env` file with the following environment variables:
```
MNEMONIC=______
TOKENID=_____
TOKENQTY=____
```

* Run the web app locally:
```
npm install
tsc
node server.js
// Now open your browser and visit: localhost:3000
```
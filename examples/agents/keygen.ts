import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
// Prints two fresh demo wallets. Keys go in .env, never in chat or git.
for (const role of ['CLIENT', 'WORKER', 'RESOLVER']) {
  const pk = generatePrivateKey()
  console.log(`${role}_ADDRESS=${privateKeyToAccount(pk).address}`)
  console.log(`${role}_PRIVATE_KEY=${pk}`)
}

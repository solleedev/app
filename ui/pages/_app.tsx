// import { ethers } from 'ethers'
// import { useEffect, useState } from 'react'
import React from 'react'
import { NftProvider } from 'use-nft'
import { WagmiConfig, createClient, configureChains, chain } from 'wagmi'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { connectors, provider as externalProvider } from '../lib/connectors'
import { ErrorProvider } from '../components/ErrorProvider'
import Layout from '../components/Layout'
import '../styles/globals.css'

const { provider } = configureChains(
  [chain.mainnet, chain.goerli, chain.foundry],
  [
    alchemyProvider({ apiKey: 'LiSy-FVZlHUWqrpxHvhf8QC2pmZBJxuk' }),
    publicProvider(),
  ]
)

const client = createClient({
  autoConnect: true,
  provider,
  connectors,
})

function App({ Component, pageProps }: any) {
  /*
  const [client, setClient] = useState<any>()

  useEffect(() => {
    let provider = externalProvider

    const userProvider =
      window.ethereum || (window as unknown as any).web3?.currentProvider
    if (userProvider && process.env.NEXT_PUBLIC_CHAIN !== 'local') {
      provider = () => {
        console.log(
          `Provider: Connected to the user's provider on chain with ID ${parseInt(
            userProvider.networkVersion
          )}`
        )
        return new ethers.providers.Web3Provider(
          userProvider,
          process.env.NEXT_PUBLIC_CHAIN
        )
      }
    }
    setClient(
      createClient({
        autoConnect: true,
        connectors,
        provider: provider(),
      })
    )
  }, [])
  */

  return (
    <>
      <WagmiConfig client={client}>
        <NftProvider fetcher={['ethers', { provider: externalProvider() }]}>
          <ErrorProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </ErrorProvider>
        </NftProvider>
      </WagmiConfig>
    </>
  )
}

export default App

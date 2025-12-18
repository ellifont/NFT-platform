export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-5xl font-bold text-center mb-8">
          NFT Marketplace
        </h1>
        <p className="text-xl text-gray-400 text-center max-w-2xl mx-auto">
          Discover, collect, and trade unique digital artwork.
          Mint your own NFTs or browse creations from artists worldwide.
        </p>

        <div className="flex justify-center gap-4 mt-12">
          <button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
            Explore NFTs
          </button>
          <button className="border border-gray-600 hover:border-gray-500 text-white font-semibold py-3 px-8 rounded-lg transition-colors">
            Connect Wallet
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3">Mint Artwork</h3>
            <p className="text-gray-400">
              Create unique NFTs from your digital artwork with ERC-721 or ERC-1155 standards.
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3">Trade NFTs</h3>
            <p className="text-gray-400">
              List your NFTs for sale and discover pieces from talented artists.
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-3">Earn Royalties</h3>
            <p className="text-gray-400">
              Creators earn royalties on every secondary sale automatically via EIP-2981.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

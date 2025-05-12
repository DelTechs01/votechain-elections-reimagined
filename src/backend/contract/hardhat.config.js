require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    base: {
      url: process.env.BASE_RPC_URL || "https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 8453,
      gasPrice: 1000000000, // 1 gwei
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 84532,
      gasPrice: 1000000000, // 1 gwei
      gas: "auto",
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "YOUR_BASESCAN_API_KEY",
      baseSepolia: process.env.BASESCAN_API_KEY || "YOUR_BASESCAN_API_KEY",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};
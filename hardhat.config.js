require("@nomiclabs/hardhat-waffle");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
// require("hardhat-contract-sizer");
// require("hardhat-gas-reporter");

const INFURA_API_KEY = process.env.INFURA_API_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

module.exports = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: { yul: false },
      },
    },
  },

  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      // forking: {
      //   url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      // },
    },

    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },

    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },

    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },

    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },

    matic: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHEREUM_API_KEY,
    // apiKey: process.env.POLYGON_API_KEY,
    // apiKey: process.env.BSC_API_KEY,
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 4000000,
  },

  // contractSizer: {
  //   alphaSort: true,
  //   disambiguatePaths: false,
  //   runOnCompile: true,
  //   strict: true,
  //   // only: [":ERC20$"],
  // },

  // gasReporter: {
  //   enabled: true,
  //   currency: "USD",
  //   token: "ETH",
  //   coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  // },
};

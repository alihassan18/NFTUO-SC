const { expect, assert } = require("chai");
const {
  ethers: {
    utils: { parseEther, formatEther },
  },
  waffle,
  ethers,
} = require("hardhat");
const web3 = require("web3");
const {
  BNToFloat,
  to18Decimals,
  stringToFloat,
} = require("../utils/conversions");
const provider = waffle.provider;

const BN = web3.utils.BN;

require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bn")(BN))
  .should();

const NAME = "NUO Token";
const SYMBOL = "NUO";
const TOTAL_SUPPLY = 100_000_000;

// const TOKEN_PRICE_IN_USD = 1;
const TOKEN_PRICE_IN_USD = "100000000000000";
const SWAP_FEE = 0;
const MIN_AMOUNT = 0.0001;
// const NUMERATOR = 10000;

const CHAINLINK_GOERLI_USDC_USD = "0xAb5c49580294Aff77670F839ea425f5b78ab3Ae7";

let MockUsdcToken;
let NuoToken;
let TokenSwap;
let rest;

describe("Deploying Token Contracts", function () {
  it("Should Deploy USDC Contract", async () => {
    [
      OWNER,
      _revenueWallet,
      notOwner,
      user1,
      user2,
      user3,
      user4,
      user5,
      ...rest
    ] = await ethers.getSigners();

    USDC_TOKEN = await ethers.getContractFactory("MockUsdcToken");
    MockUsdcToken = await USDC_TOKEN.deploy();
    await MockUsdcToken.deployed();
  });

  it("USDC token should be deployed accurately", async () => {
    let usdcAddress = MockUsdcToken.address;
    usdcAddress.should.not.equal(ethers.constants.AddressZero);
  });

  it("Should Deploy NUO token Contract", async () => {
    const NUO_TOKEN = await ethers.getContractFactory("NuoToken");
    NuoToken = await NUO_TOKEN.deploy(
      NAME,
      SYMBOL,
      parseEther(TOTAL_SUPPLY.toString())
    );
    await NuoToken.deployed();
  });

  it("NUO token should be deployed accurately", async () => {
    let nuoAddress = NuoToken.address;
    nuoAddress.should.not.equal(ethers.constants.AddressZero);
  });

  it("Parameter should have been set properly", async () => {
    let tokenName = await NuoToken.name();
    let tokenSymbol = await NuoToken.symbol();
    let tokenTotalSupply = await NuoToken.totalSupply();

    tokenName.should.be.equal(NAME);
    tokenSymbol.should.be.equal(SYMBOL);
    tokenTotalSupply.should.be.equal(parseEther(TOTAL_SUPPLY.toString()));
  });

  it("Owner should hold all supply", async () => {
    let ownerBal = await NuoToken.balanceOf(OWNER.address);
    ownerBal.should.be.equal(parseEther(TOTAL_SUPPLY.toString()));
  });
});

describe("NUO Token Pauseable [OnlyOwner]", function () {
  it("Should reject when paused by non-owner", async () => {
    await NuoToken.connect(user1).pause().should.be.rejectedWith("Ownable");
    await NuoToken.connect(user2).pause().should.be.rejectedWith("Ownable");
    await NuoToken.connect(user3).pause().should.be.rejectedWith("Ownable");
  });

  it("Owner should be able to pause the NUO Token Contract", async () => {
    await NuoToken.connect(OWNER).pause().should.be.fulfilled;
  });

  it("Shouldn't let transfer if Paused", async () => {
    await NuoToken.connect(OWNER)
      .transfer(user1.address, parseEther("100"))
      .should.be.rejectedWith("Pausable");

    await NuoToken.connect(OWNER)
      .transfer(user2.address, parseEther("100"))
      .should.be.rejectedWith("Pausable");
  });

  it("Should reject when unpaused by non-owner", async () => {
    await NuoToken.connect(user1).unpause().should.be.rejectedWith("Ownable");
    await NuoToken.connect(user2).unpause().should.be.rejectedWith("Ownable");
    await NuoToken.connect(user3).unpause().should.be.rejectedWith("Ownable");
  });

  it("Owner should be able to Unpause the Contract", async () => {
    await NuoToken.connect(OWNER).unpause().should.be.fulfilled;
  });
});

describe("Deploy Swapping Contract", function () {
  it("Should Deploy Token Swap Contract", async () => {
    const TOKEN_SWAP = await ethers.getContractFactory("TokenSwap");
    TokenSwap = await TOKEN_SWAP.deploy(
      NuoToken.address,
      TOKEN_PRICE_IN_USD,
      parseEther(SWAP_FEE.toString()),
      parseEther(MIN_AMOUNT.toString()),
      MockUsdcToken.address,
      OWNER.address
    );
    await TokenSwap.deployed();
  });

  it("Should have set all parameters accurately", async () => {
    let usdcTokenResponse = await TokenSwap.UsdcToken();
    let nuoTokenResponse = await TokenSwap.NuoToken();
    let tokenPriceInUsdcResponse = (
      await TokenSwap.tokenPriceInUsd()
    ).toString();
    let swapFeeResponse = (await TokenSwap.swapFee()).toString();
    let minSwapAmountResponse = formatEther(await TokenSwap.minSwapAmount());

    usdcTokenResponse.should.be.equal(MockUsdcToken.address);
    nuoTokenResponse.should.be.equal(NuoToken.address);
    tokenPriceInUsdcResponse.should.be.equal(TOKEN_PRICE_IN_USD.toString());
    swapFeeResponse.should.be.equal(SWAP_FEE.toString());
    minSwapAmountResponse.should.be.equal(MIN_AMOUNT.toString());
  });
});

describe("Token Swap Getters and Setters should work as expected", function () {
  let tokenPriceToUpdate;
  let swapFeeToUpdate;
  let minSwapAmountToUpdate;
  let numeratorToUpdate;
  let walletAddressToUpdate;

  it("Should set temp variables", async () => {
    tokenPriceToUpdate = "400";
    swapFeeToUpdate = "100000000000";
    minSwapAmountToUpdate = "100000000";
    numeratorToUpdate = "10";
    walletAddressToUpdate = rest[0].address;
  });

  it("Only Owner should successfully update the Token", async () => {
    await TokenSwap.connect(user1)
      .updateToken(rest[0].address)
      .should.be.rejectedWith("Ownable");
    await TokenSwap.connect(OWNER).updateToken(rest[0].address).should.be
      .fulfilled;
    let updatedNuoToken = await TokenSwap.NuoToken();
    updatedNuoToken.should.be.equal(rest[0].address);
  });

  it("Only Owner should successfully update Token USD Price", async () => {
    await TokenSwap.connect(user2)
      .updateTokenPrice(tokenPriceToUpdate)
      .should.be.rejectedWith("Ownable");
    await TokenSwap.connect(OWNER).updateTokenPrice(tokenPriceToUpdate).should
      .be.fulfilled;
    let updatedTokenPrice = (await TokenSwap.tokenPriceInUsd()).toString();
    updatedTokenPrice.should.be.equal(tokenPriceToUpdate);
  });

  it("Only Owner should successfully update Swap Fee", async () => {
    await TokenSwap.connect(user3)
      .updateSwapFee(swapFeeToUpdate)
      .should.be.rejectedWith("Ownable");
    await TokenSwap.connect(OWNER).updateSwapFee(swapFeeToUpdate).should.be
      .fulfilled;
    let updatedSwapFee = (await TokenSwap.swapFee()).toString();
    updatedSwapFee.should.be.equal(swapFeeToUpdate);
  });

  it("Only Owner should successfully update Minimum Swap Amount", async () => {
    await TokenSwap.connect(user3)
      .updateMinimumSwapAmount(minSwapAmountToUpdate)
      .should.be.rejectedWith("Ownable");
    await TokenSwap.connect(OWNER).updateMinimumSwapAmount(
      minSwapAmountToUpdate
    ).should.be.fulfilled;
    let updatedMinimumSwapAmount = (await TokenSwap.minSwapAmount()).toString();
    updatedMinimumSwapAmount.should.be.equal(minSwapAmountToUpdate);
  });

  it("Only Owner should successfully update Minimum Swap Amount", async () => {
    // await TokenSwap.connect(user3)
    //   .updateNumerator(numeratorToUpdate)
    //   .should.be.rejectedWith("Ownable");
    // await TokenSwap.connect(OWNER).updateNumerator(numeratorToUpdate).should.be
    //   .fulfilled;
    // let updatedNumerator = (await TokenSwap.numerator()).toString();
    // updatedNumerator.should.be.equal(numeratorToUpdate);
  });

  it("Only Owner should successfully update Wallet address", async () => {
    await TokenSwap.connect(user3)
      .updateWalletAddress(walletAddressToUpdate)
      .should.be.rejectedWith("Ownable");
    await TokenSwap.connect(OWNER).updateWalletAddress(walletAddressToUpdate)
      .should.be.fulfilled;
    let updatedWalletAddress = (await TokenSwap.wallet()).toString();
    updatedWalletAddress.should.be.equal(walletAddressToUpdate);
  });
});

describe("It should reset values", function () {
  it("Should set back all constructor values accurately", async () => {
    await TokenSwap.connect(OWNER).updateToken(NuoToken.address).should.be
      .fulfilled;
    await TokenSwap.connect(OWNER).updateTokenPrice(TOKEN_PRICE_IN_USD).should
      .be.fulfilled;
    await TokenSwap.connect(OWNER).updateSwapFee(
      parseEther(SWAP_FEE.toString())
    ).should.be.fulfilled;
    await TokenSwap.connect(OWNER).updateMinimumSwapAmount(
      // parseEther(MIN_AMOUNT.toString())
      "100000000000000"
    ).should.be.fulfilled;

    await TokenSwap.connect(OWNER).updateWalletAddress(OWNER.address).should.be
      .fulfilled;

    let updatedNuoToken = await TokenSwap.NuoToken();
    updatedNuoToken.should.be.equal(NuoToken.address);

    let updatedTokenPrice = (await TokenSwap.tokenPriceInUsd()).toString();
    updatedTokenPrice.should.be.equal(TOKEN_PRICE_IN_USD.toString());

    let updatedSwapFee = (await TokenSwap.swapFee()).toString();
    updatedSwapFee.should.be.equal(SWAP_FEE.toString());

    let updatedMinimumSwapAmount = formatEther(await TokenSwap.minSwapAmount());
    updatedMinimumSwapAmount.should.be.equal(MIN_AMOUNT.toString());

    let updatedWalletAddress = (await TokenSwap.wallet()).toString();
    updatedWalletAddress.should.be.equal(OWNER.address);
  });
});

describe("NUO and USDC Token transfers to Users and TokenSwap Contract", function () {
  let nuoTokenAmountToTransfer = parseEther("100000");
  it("Should Transfer 100 NUO Tokens", async () => {
    await NuoToken.connect(OWNER).transfer(
      TokenSwap.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;

    await NuoToken.connect(OWNER).transfer(
      user1.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;

    await NuoToken.connect(OWNER).transfer(
      user2.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;

    await NuoToken.connect(OWNER).transfer(
      user3.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;

    await NuoToken.connect(OWNER).transfer(
      user4.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;
  });

  it("Accurate amount of NUO Tokens should be received", async () => {
    let tokenSwapContractBal = await NuoToken.balanceOf(TokenSwap.address);
    let user1Bal = await NuoToken.balanceOf(user1.address);
    let user2Bal = await NuoToken.balanceOf(user2.address);
    let user3Bal = await NuoToken.balanceOf(user3.address);
    let user4Bal = await NuoToken.balanceOf(user4.address);

    tokenSwapContractBal.should.be.equal(nuoTokenAmountToTransfer);
    user1Bal.should.be.equal(nuoTokenAmountToTransfer);
    user2Bal.should.be.equal(nuoTokenAmountToTransfer);
    user3Bal.should.be.equal(nuoTokenAmountToTransfer);
    user4Bal.should.be.equal(nuoTokenAmountToTransfer);
  });

  it("Should Transfer 100 USDC Tokens", async () => {
    await MockUsdcToken.connect(OWNER).transfer(
      TokenSwap.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;

    await MockUsdcToken.connect(OWNER).transfer(
      user1.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;

    await MockUsdcToken.connect(OWNER).transfer(
      user2.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;

    await MockUsdcToken.connect(OWNER).transfer(
      user3.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;

    await MockUsdcToken.connect(OWNER).transfer(
      user4.address,
      nuoTokenAmountToTransfer
    ).should.be.fulfilled;
  });

  it("Accurate amount of NUO Tokens should be received", async () => {
    let tokenSwapContractBal = await MockUsdcToken.balanceOf(TokenSwap.address);
    let user1Bal = await MockUsdcToken.balanceOf(user1.address);
    let user2Bal = await MockUsdcToken.balanceOf(user2.address);
    let user3Bal = await MockUsdcToken.balanceOf(user3.address);
    let user4Bal = await MockUsdcToken.balanceOf(user4.address);

    tokenSwapContractBal.should.be.equal(nuoTokenAmountToTransfer);
    user1Bal.should.be.equal(nuoTokenAmountToTransfer);
    user2Bal.should.be.equal(nuoTokenAmountToTransfer);
    user3Bal.should.be.equal(nuoTokenAmountToTransfer);
    user4Bal.should.be.equal(nuoTokenAmountToTransfer);
  });
});

describe("Set ERC20 Approvals", function () {
  let approvalAmount = parseEther("100000");
  it("Should set approvals for NUO Tokens", async () => {
    await NuoToken.connect(user1).approve(TokenSwap.address, approvalAmount)
      .should.be.fulfilled;
    await NuoToken.connect(user2).approve(TokenSwap.address, approvalAmount)
      .should.be.fulfilled;
    await NuoToken.connect(user3).approve(TokenSwap.address, approvalAmount)
      .should.be.fulfilled;
    await NuoToken.connect(user4).approve(TokenSwap.address, approvalAmount)
      .should.be.fulfilled;

    let user1Allowance = await NuoToken.allowance(
      user1.address,
      TokenSwap.address
    );
    let user2Allowance = await NuoToken.allowance(
      user2.address,
      TokenSwap.address
    );
    let user3Allowance = await NuoToken.allowance(
      user3.address,
      TokenSwap.address
    );
    let user4Allowance = await NuoToken.allowance(
      user4.address,
      TokenSwap.address
    );

    user1Allowance.should.be.equal(approvalAmount);
    user2Allowance.should.be.equal(approvalAmount);
    user3Allowance.should.be.equal(approvalAmount);
    user4Allowance.should.be.equal(approvalAmount);
  });

  it("Should set approvals for USDC Tokens", async () => {
    await MockUsdcToken.connect(user1).approve(
      TokenSwap.address,
      approvalAmount
    ).should.be.fulfilled;
    await MockUsdcToken.connect(user2).approve(
      TokenSwap.address,
      approvalAmount
    ).should.be.fulfilled;
    await MockUsdcToken.connect(user3).approve(
      TokenSwap.address,
      approvalAmount
    ).should.be.fulfilled;
    await MockUsdcToken.connect(user4).approve(
      TokenSwap.address,
      approvalAmount
    ).should.be.fulfilled;

    let user1Allowance = await MockUsdcToken.allowance(
      user1.address,
      TokenSwap.address
    );
    let user2Allowance = await MockUsdcToken.allowance(
      user2.address,
      TokenSwap.address
    );
    let user3Allowance = await MockUsdcToken.allowance(
      user3.address,
      TokenSwap.address
    );
    let user4Allowance = await MockUsdcToken.allowance(
      user4.address,
      TokenSwap.address
    );

    user1Allowance.should.be.equal(approvalAmount);
    user2Allowance.should.be.equal(approvalAmount);
    user3Allowance.should.be.equal(approvalAmount);
    user4Allowance.should.be.equal(approvalAmount);
  });
});

describe("Swap should fail when", function () {
  let minimumSwapAmount;
  it("Swap amount is less than Minimum Swap Amount", async () => {
    minimumSwapAmount = parseFloat(
      formatEther(await TokenSwap.minSwapAmount())
    );

    // await TokenSwap.connect(user1)
    //   .swap("NUO", parseEther((minimumSwapAmount - 0.000001).toString()))
    //   .should.be.rejectedWith("Swap: Too low value for Swap");

    // await TokenSwap.connect(user1)
    //   .swap("NUO", parseEther((minimumSwapAmount - 0.000005).toString()))
    //   .should.be.rejectedWith("Swap: Too low value for Swap");

    // await TokenSwap.connect(user1)
    //   .swap("NUO", parseEther((minimumSwapAmount - 0.0001).toString()))
    //   .should.be.rejectedWith("Swap: Too low value for Swap");
  });

  it("NUO Token balance is zero", async () => {
    await TokenSwap.connect(rest[0])
      .swap("NUO", parseEther(minimumSwapAmount.toString()))
      .should.be.rejectedWith("Swap: Insufficient token balance");

    await TokenSwap.connect(rest[1])
      .swap("NUO", parseEther(minimumSwapAmount.toString()))
      .should.be.rejectedWith("Swap: Insufficient token balance");

    await TokenSwap.connect(rest[2])
      .swap("NUO", parseEther(minimumSwapAmount.toString()))
      .should.be.rejectedWith("Swap: Insufficient token balance");
  });

  it("NUO Token balance is less than amount", async () => {
    let tokenAmountTransferred = 100000;
    await TokenSwap.connect(user1)
      .swap("NUO", parseEther((tokenAmountTransferred + 10).toString()))
      .should.be.rejectedWith("Swap: Insufficient token balance");

    await TokenSwap.connect(user2)
      .swap("NUO", parseEther((tokenAmountTransferred + 10).toString()))
      .should.be.rejectedWith("Swap: Insufficient token balance");

    await TokenSwap.connect(user3)
      .swap("NUO", parseEther((tokenAmountTransferred + 10).toString()))
      .should.be.rejectedWith("Swap: Insufficient token balance");
  });
});
// to Remove
describe("It should swap", function () {
  it("Check User balances (NUO & USDC) before swap", async () => {
    user1BeforeBal_NUO = parseFloat(
      formatEther(await NuoToken.balanceOf(user1.address))
    );
    user1BeforeBal_USDC = parseFloat(
      formatEther(await MockUsdcToken.balanceOf(user1.address))
    );
    console.log("user1BeforeBal_NUO", user1BeforeBal_NUO);
    console.log("user1BeforeBal_USDC", user1BeforeBal_USDC);

    contractBeforeBal_NUO = parseFloat(
      formatEther(await NuoToken.balanceOf(TokenSwap.address))
    );
    contractBeforeBal_USDC = parseFloat(
      formatEther(await MockUsdcToken.balanceOf(TokenSwap.address))
    );
    console.log("contractBeforeBal_NUO", contractBeforeBal_NUO);
    console.log("contractBeforeBal_USDC", contractBeforeBal_USDC);

    let swapAmountNUO = 10000;

    await TokenSwap.connect(user1).swap("NUO", "10000000000000000000000");
    await TokenSwap.connect(user1).swap("USDC", "1000000");

    user1BeforeBal_NUO = await NuoToken.balanceOf(user1.address);
    // user1BeforeBal_USDC = await MockUsdcToken.balanceOf(user1.address);

    // console.log("user1BeforeBal_NUO", user1BeforeBal_NUO);
    // console.log("user1BeforeBal_USDC", user1BeforeBal_USDC);
  });
});
// ===========================

// describe("Swap NUO => USDC - should work as expected", function () {
//   let user1BeforeBal_NUO;
//   let user1BeforeBal_USDC;
//   let contractBeforeBal_NUO;
//   let contractBeforeBal_USDC;

//   let user1AfterBal_NUO;
//   let user1AfterBal_USDC;
//   let contractAfterBal_NUO;
//   let contractAfterBal_USDC;

//   let swapAmountNUO = 100000;

//   it("Check User balances (NUO & USDC) before swap", async () => {
//     user1BeforeBal_NUO = parseFloat(
//       formatEther(await NuoToken.balanceOf(user1.address))
//     );
//     user1BeforeBal_USDC = parseFloat(
//       formatEther(await MockUsdcToken.balanceOf(user1.address))
//     );
//     console.log("user1BeforeBal_NUO", user1BeforeBal_NUO);
//     console.log("user1BeforeBal_USDC", user1BeforeBal_USDC);
//   });

//   it("Check Swap Contract balances (NUO & USDC) before swap", async () => {
//     contractBeforeBal_NUO = parseFloat(
//       formatEther(await NuoToken.balanceOf(TokenSwap.address))
//     );
//     contractBeforeBal_USDC = parseFloat(
//       formatEther(await MockUsdcToken.balanceOf(TokenSwap.address))
//     );
//     console.log("contractBeforeBal_NUO", contractBeforeBal_NUO);
//     console.log("contractBeforeBal_USDC", contractBeforeBal_USDC);
//   });

//   it(`Should swap 10 NUO for USDCs, NUO price being $${"TOKEN_PRICE_IN_USD / NUMERATOR"}`, async () => {
//     await TokenSwap.connect(user1).swap(
//       "NUO",
//       parseEther(swapAmountNUO.toString())
//     ).should.be.fulfilled;
//   });

//   it("Check User balances (NUO & USDC) After swap", async () => {
//     user1AfterBal_NUO = parseFloat(
//       formatEther(await NuoToken.balanceOf(user1.address))
//     );
//     user1AfterBal_USDC = parseFloat(
//       formatEther(await MockUsdcToken.balanceOf(user1.address))
//     );
//     console.log("user1AfterBal_NUO", user1AfterBal_NUO);
//     console.log("user1AfterBal_USDC", user1AfterBal_USDC);
//   });

//   it("Check Swap Contract balances (NUO & USDC) After swap", async () => {
//     contractAfterBal_NUO = parseFloat(
//       formatEther(await NuoToken.balanceOf(TokenSwap.address))
//     );
//     contractAfterBal_USDC = parseFloat(
//       formatEther(await MockUsdcToken.balanceOf(TokenSwap.address))
//     );
//     console.log("contractAfterBal_NUO", contractAfterBal_NUO);
//     console.log("contractAfterBal_USDC", contractAfterBal_USDC);
//   });
//   it("Balances should have updated accurately", async () => {
//     // let NUOChange = swapAmountNUO;
//     // let USDCChange = swapAmountNUO * (TOKEN_PRICE_IN_USD / NUMERATOR);
//     // console.log("NUOChange", NUOChange);
//     // console.log("USDCChange", USDCChange);
//     // user1AfterBal_NUO.should.be.equal(user1BeforeBal_NUO - NUOChange);
//     // user1AfterBal_USDC.should.be.equal(user1BeforeBal_USDC + USDCChange);
//     // contractAfterBal_NUO.should.be.equal(contractBeforeBal_NUO + NUOChange);
//     // contractAfterBal_USDC.should.be.equal(contractBeforeBal_USDC - USDCChange);
//   });
// });

// describe("Swap USDC => NUO - should work as expected", function () {
//   let user2BeforeBal_NUO;
//   let user2BeforeBal_USDC;
//   let contractBeforeBal_NUO;
//   let contractBeforeBal_USDC;

//   let user2AfterBal_NUO;
//   let user2AfterBal_USDC;
//   let contractAfterBal_NUO;
//   let contractAfterBal_USDC;

//   let swapAmountUSDC = 1;

//   it("Check User balances (NUO & USDC) before swap", async () => {
//     user2BeforeBal_NUO = parseFloat(
//       formatEther(await NuoToken.balanceOf(user2.address))
//     );
//     user2BeforeBal_USDC = parseFloat(
//       formatEther(await MockUsdcToken.balanceOf(user2.address))
//     );
//     console.log("user2BeforeBal_NUO", user2BeforeBal_NUO);
//     console.log("user2BeforeBal_USDC", user2BeforeBal_USDC);
//   });

//   it("Check Swap Contract balances (NUO & USDC) before swap", async () => {
//     contractBeforeBal_NUO = parseFloat(
//       formatEther(await NuoToken.balanceOf(TokenSwap.address))
//     );
//     contractBeforeBal_USDC = parseFloat(
//       formatEther(await MockUsdcToken.balanceOf(TokenSwap.address))
//     );
//     console.log("contractBeforeBal_NUO", contractBeforeBal_NUO);
//     console.log("contractBeforeBal_USDC", contractBeforeBal_USDC);
//   });

//   it(`Should swap 10 NUO for USDCs, NUO price being $${"TOKEN_PRICE_IN_USD / NUMERATOR"}`, async () => {
//     await TokenSwap.connect(user2).swap(
//       "USDC",
//       parseEther(swapAmountUSDC.toString())
//     ).should.be.fulfilled;
//   });

//   it("Check User balances (NUO & USDC) After swap", async () => {
//     user2AfterBal_NUO = parseFloat(
//       formatEther(await NuoToken.balanceOf(user2.address))
//     );
//     user2AfterBal_USDC = parseFloat(
//       formatEther(await MockUsdcToken.balanceOf(user2.address))
//     );
//     console.log("user2AfterBal_NUO", user2AfterBal_NUO);
//     console.log("user2AfterBal_USDC", user2AfterBal_USDC);
//   });
//   it("Check Swap Contract balances (NUO & USDC) After swap", async () => {
//     contractAfterBal_NUO = parseFloat(
//       formatEther(await NuoToken.balanceOf(TokenSwap.address))
//     );
//     contractAfterBal_USDC = parseFloat(
//       formatEther(await MockUsdcToken.balanceOf(TokenSwap.address))
//     );
//     console.log("contractAfterBal_NUO", contractAfterBal_NUO);
//     console.log("contractAfterBal_USDC", contractAfterBal_USDC);
//   });
//   it("Balances should have updated accurately", async () => {
//     // let USDCChange = swapAmountUSDC;
//     // let NUOChange = swapAmountUSDC / (TOKEN_PRICE_IN_USD / NUMERATOR);
//     // console.log("USDCChange", USDCChange);
//     // console.log("NUOChange", NUOChange);
//     // console.log("=>", swapAmountUSDC / (TOKEN_PRICE_IN_USD / NUMERATOR));
//     // user2AfterBal_NUO.should.be.equal(user2BeforeBal_NUO + NUOChange);
//     // user2AfterBal_USDC.should.be.equal(user2BeforeBal_USDC - USDCChange);
//     // contractAfterBal_NUO.should.be.equal(contractBeforeBal_NUO - NUOChange);
//     // contractAfterBal_USDC.should.be.equal(contractBeforeBal_USDC + USDCChange);
//   });
// });

// describe("Withdraw", function () {
//   it("Non-Owner shouldn't be able to withdraw", async () => {
//     await TokenSwap.connect(user1)
//       .withdrawTokens(parseEther("10"))
//       .should.be.rejectedWith("Ownable");

//     await TokenSwap.connect(user2)
//       .withdrawUsdc(parseEther("10"))
//       .should.be.rejectedWith("Ownable");

//     await TokenSwap.connect(user3)
//       .emergencyWithdraw()
//       .should.be.rejectedWith("Ownable");
//   });

//   it("Should withdraw successfully", async () => {
//     await TokenSwap.withdrawTokens(parseEther("10")).should.be.fulfilled;
//     await TokenSwap.withdrawUsdc(parseEther("10")).should.be.fulfilled;
//   });

//   it("Should drain the contract", async () => {
//     await TokenSwap.emergencyWithdraw().should.be.fulfilled;
//     (await NuoToken.balanceOf(TokenSwap.address)).should.be.equal("0");
//     (await MockUsdcToken.balanceOf(TokenSwap.address)).should.be.equal("0");
//   });
// });

// describe("Price Conversions", function () {
//   it("Should convert Okay", async () => {
//     let NUOTokenInUsd = 0.001;
//     let UsdcTokenInUsd = 1;

//     console.log("Sell 10 Usdc for Nuo");

//     let priceInTokens = (10 * UsdcTokenInUsd) / NUOTokenInUsd;

//     let priceInUsdc = (10 * NUOTokenInUsd) / UsdcTokenInUsd;

//     console.log(priceInTokens);
//     console.log(priceInUsdc);
//   });
// });

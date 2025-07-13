import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleSwap, MyToken, MyToken2 } from "../typechain-types";

describe("SimpleSwap", function () {
  let simpleSwap: SimpleSwap;
  let myToken: MyToken;
  let myToken2: MyToken2;
  let owner: any;
  let addr1: any;
  let addr2: any;

  const initialSupply = ethers.parseEther("1000"); // 1,000 tokens

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy MyToken
    const MyTokenFactory = await ethers.getContractFactory("MyToken");
    myToken = await MyTokenFactory.deploy(initialSupply);
    await myToken.waitForDeployment();

    // Deploy MyToken2
    const MyToken2Factory = await ethers.getContractFactory("MyToken2");
    myToken2 = await MyToken2Factory.deploy(initialSupply);
    await myToken2.waitForDeployment();

    // Deploy SimpleSwap
    const SimpleSwapFactory = await ethers.getContractFactory("SimpleSwap");
    simpleSwap = await SimpleSwapFactory.deploy();
    await simpleSwap.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct LP token name and symbol", async function () {
      expect(await simpleSwap.name()).to.equal("SimpleSwap LP");
      expect(await simpleSwap.symbol()).to.equal("SSLP");
    });

    it("Should have tokenA and tokenB addresses as zero initially", async function () {
      expect(await simpleSwap.tokenA()).to.equal(ethers.ZeroAddress);
      expect(await simpleSwap.tokenB()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("addLiquidity", function () {
    it("Should add initial liquidity and mint LP tokens", async function () {
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now

      // Approve SimpleSwap to spend tokens
      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountB);

      await expect(simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountA,
        amountB,
        amountA, // amountAMin
        amountB, // amountBMin
        owner.address,
        deadline
      )).to.emit(simpleSwap, "Transfer"); // ERC20 Transfer event for LP tokens

      expect(await simpleSwap.reserveA()).to.equal(amountA);
      expect(await simpleSwap.reserveB()).to.equal(amountB);
      expect(await simpleSwap.balanceOf(owner.address)).to.be.gt(0); // Owner should have LP tokens
    });

    it("Should add liquidity to an existing pool", async function () {
      // Add initial liquidity
      const initialAmountA = ethers.parseEther("100");
      const initialAmountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), initialAmountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), initialAmountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        initialAmountA,
        initialAmountB,
        initialAmountA,
        initialAmountB,
        owner.address,
        deadline
      );

      // Add more liquidity
      const additionalAmountA = ethers.parseEther("50");
      const additionalAmountB = ethers.parseEther("50");

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), additionalAmountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), additionalAmountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        additionalAmountA,
        additionalAmountB,
        additionalAmountA,
        additionalAmountB,
        owner.address,
        deadline
      );

      expect(await simpleSwap.reserveA()).to.equal(initialAmountA + additionalAmountA);
      expect(await simpleSwap.reserveB()).to.equal(initialAmountB + additionalAmountB);
    });

    it("Should revert if deadline is exceeded", async function () {
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const pastDeadline = Math.floor(Date.now() / 1000) - 60; // 1 minute ago

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountB);

      await expect(simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        owner.address,
        pastDeadline
      )).to.be.revertedWith("SimpleSwap: EXPIRED");
    });

    it("Should revert with INVALID_TOKENS if incorrect tokens are provided after initial liquidity", async function () {
      // Add initial liquidity
      const initialAmountA = ethers.parseEther("100");
      const initialAmountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), initialAmountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), initialAmountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        initialAmountA,
        initialAmountB,
        initialAmountA,
        initialAmountB,
        owner.address,
        deadline
      );

      // Try to add liquidity with incorrect tokenA
      await expect(simpleSwap.connect(owner).addLiquidity(
        addr1.address, // Incorrect token
        await myToken2.getAddress(),
        ethers.parseEther("10"),
        ethers.parseEther("10"),
        ethers.parseEther("10"),
        ethers.parseEther("10"),
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INVALID_TOKENS");
    });

    it("Should revert with INSUFFICIENT_B_AMOUNT if amountBDesired is too low", async function () {
      // Add initial liquidity
      const initialAmountA = ethers.parseEther("100");
      const initialAmountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), initialAmountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), initialAmountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        initialAmountA,
        initialAmountB,
        initialAmountA,
        initialAmountB,
        owner.address,
        deadline
      );

      // Try to add liquidity with insufficient B amount
      const amountADesired = ethers.parseEther("10");
      const amountBDesired = ethers.parseEther("10"); // Make it equal to optimal
      const amountBMin = ethers.parseEther("11"); // Make optimal less than min

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountADesired);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountBDesired);

      await expect(simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountADesired,
        amountBDesired,
        amountADesired,
        amountBMin,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INSUFFICIENT_B_AMOUNT");
    });

    it("Should revert with INSUFFICIENT_A_AMOUNT if amountADesired is too low", async function () {
      // Add initial liquidity
      const initialAmountA = ethers.parseEther("100");
      const initialAmountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), initialAmountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), initialAmountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        initialAmountA,
        initialAmountB,
        initialAmountA,
        initialAmountB,
        owner.address,
        deadline
      );

      // Try to add liquidity with insufficient A amount
      const amountADesired = ethers.parseEther("100"); // Make it large enough to go to else branch
      const amountBDesired = ethers.parseEther("10");
      const amountAMin = ethers.parseEther("11"); // Make optimal less than min

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountADesired);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountBDesired);

      await expect(simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBDesired,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INSUFFICIENT_A_AMOUNT");
    });

    it("Should revert with INSUFFICIENT_LIQUIDITY_MINTED if no liquidity is minted", async function () {
      const amountA = ethers.parseEther("0");
      const amountB = ethers.parseEther("0");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountB);

      await expect(simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INSUFFICIENT_LIQUIDITY_MINTED");
    });
  });

  describe("removeLiquidity", function () {
    beforeEach(async function () {
      // Add initial liquidity for removeLiquidity tests
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        owner.address,
        deadline
      );
    });

    it("Should remove liquidity and burn LP tokens", async function () {
      const lpTokens = await simpleSwap.balanceOf(owner.address);
      const amountAMin = ethers.parseEther("1");
      const amountBMin = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      const ownerTokenABalanceBefore = await myToken.balanceOf(owner.address);
      const ownerTokenBBalanceBefore = await myToken2.balanceOf(owner.address);

      await expect(simpleSwap.connect(owner).removeLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        lpTokens,
        amountAMin,
        amountBMin,
        owner.address,
        deadline
      )).to.emit(simpleSwap, "Transfer"); // ERC20 Transfer event for LP tokens (burn)

      expect(await simpleSwap.balanceOf(owner.address)).to.equal(0);
      expect(await myToken.balanceOf(owner.address)).to.be.gt(ownerTokenABalanceBefore);
      expect(await myToken2.balanceOf(owner.address)).to.be.gt(ownerTokenBBalanceBefore);
    });

    it("Should revert if deadline is exceeded", async function () {
      const lpTokens = await simpleSwap.balanceOf(owner.address);
      const amountAMin = ethers.parseEther("1");
      const amountBMin = ethers.parseEther("1");
      const pastDeadline = Math.floor(Date.now() / 1000) - 60;

      await expect(simpleSwap.connect(owner).removeLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        lpTokens,
        amountAMin,
        amountBMin,
        owner.address,
        pastDeadline
      )).to.be.revertedWith("SimpleSwap: EXPIRED");
    });

    it("Should revert with INVALID_TOKENS if incorrect tokens are provided", async function () {
      const lpTokens = await simpleSwap.balanceOf(owner.address);
      const amountAMin = ethers.parseEther("1");
      const amountBMin = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await expect(simpleSwap.connect(owner).removeLiquidity(
        addr1.address, // Incorrect token
        await myToken2.getAddress(),
        lpTokens,
        amountAMin,
        amountBMin,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INVALID_TOKENS");
    });

    it("Should revert with INSUFFICIENT_LP_TOKEN_BURNED if not enough LP tokens", async function () {
      const lpTokens = ethers.parseEther("1000000"); // More than available
      const amountAMin = ethers.parseEther("1");
      const amountBMin = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await expect(simpleSwap.connect(owner).removeLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        lpTokens,
        amountAMin,
        amountBMin,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INSUFFICIENT_LP_TOKEN_BURNED");
    });

    it("Should revert with INSUFFICIENT_A_AMOUNT if amountAMin is not met", async function () {
      const lpTokens = await simpleSwap.balanceOf(owner.address);
      const amountAMin = ethers.parseEther("1000"); // Too high
      const amountBMin = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await expect(simpleSwap.connect(owner).removeLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        lpTokens,
        amountAMin,
        amountBMin,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INSUFFICIENT_A_AMOUNT");
    });

    it("Should revert with INSUFFICIENT_B_AMOUNT if amountBMin is not met", async function () {
      const lpTokens = await simpleSwap.balanceOf(owner.address);
      const amountAMin = ethers.parseEther("1");
      const amountBMin = ethers.parseEther("1000"); // Too high
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await expect(simpleSwap.connect(owner).removeLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        lpTokens,
        amountAMin,
        amountBMin,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INSUFFICIENT_B_AMOUNT");
    });
  });

  describe("swapExactTokensForTokens", function () {
    beforeEach(async function () {
      // Add initial liquidity for swap tests
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        owner.address,
        deadline
      );
    });

    it("Should swap tokenA for tokenB", async function () {
      const amountIn = ethers.parseEther("10");
      const amountOutMin = ethers.parseEther("9"); // Expect at least 9 tokens out
      const path = [await myToken.getAddress(), await myToken2.getAddress()];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      const ownerTokenABalanceBefore = await myToken.balanceOf(owner.address);
      const ownerTokenBBalanceBefore = await myToken2.balanceOf(owner.address);

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountIn);

      await simpleSwap.connect(owner).swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        owner.address,
        deadline
      );

      expect(await myToken.balanceOf(owner.address)).to.equal(ownerTokenABalanceBefore - amountIn);
      expect(await myToken2.balanceOf(owner.address)).to.be.gt(ownerTokenBBalanceBefore);
    });

    it("Should swap tokenB for tokenA", async function () {
      const amountIn = ethers.parseEther("10");
      const amountOutMin = ethers.parseEther("9"); // Expect at least 9 tokens out
      const path = [await myToken2.getAddress(), await myToken.getAddress()];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      const ownerTokenABalanceBefore = await myToken.balanceOf(owner.address);
      const ownerTokenBBalanceBefore = await myToken2.balanceOf(owner.address);

      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountIn);

      await simpleSwap.connect(owner).swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        owner.address,
        deadline
      );

      expect(await myToken2.balanceOf(owner.address)).to.equal(ownerTokenBBalanceBefore - amountIn);
      expect(await myToken.balanceOf(owner.address)).to.be.gt(ownerTokenABalanceBefore);
    });

    it("Should revert if deadline is exceeded", async function () {
      const amountIn = ethers.parseEther("10");
      const amountOutMin = ethers.parseEther("9");
      const path = [await myToken.getAddress(), await myToken2.getAddress()];
      const pastDeadline = Math.floor(Date.now() / 1000) - 60;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountIn);

      await expect(simpleSwap.connect(owner).swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        owner.address,
        pastDeadline
      )).to.be.revertedWith("SimpleSwap: EXPIRED");
    });

    it("Should revert with INVALID_PATH if path length is not 2", async function () {
      const amountIn = ethers.parseEther("10");
      const amountOutMin = ethers.parseEther("9");
      const path = [await myToken.getAddress()]; // Invalid path length
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountIn);

      await expect(simpleSwap.connect(owner).swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INVALID_PATH");
    });

    it("Should revert with INVALID_PATH if tokens in path are not the pool tokens", async function () {
      const amountIn = ethers.parseEther("10");
      const amountOutMin = ethers.parseEther("9");
      const path = [await myToken.getAddress(), addr1.address]; // Invalid token in path
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountIn);

      await expect(simpleSwap.connect(owner).swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INVALID_PATH");
    });

    it("Should revert with INSUFFICIENT_OUTPUT_AMOUNT if amountOutMin is not met", async function () {
      const amountIn = ethers.parseEther("1");
      const amountOutMin = ethers.parseEther("100"); // Too high
      const path = [await myToken.getAddress(), await myToken2.getAddress()];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountIn);

      await expect(simpleSwap.connect(owner).swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        owner.address,
        deadline
      )).to.be.revertedWith("SimpleSwap: INSUFFICIENT_OUTPUT_AMOUNT");
    });
  });

  describe("getAmountOut", function () {
    beforeEach(async function () {
      // Add initial liquidity for getAmountOut tests
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        owner.address,
        deadline
      );
    });

    it("Should calculate the correct amount out", async function () {
      const amountIn = ethers.parseEther("10");
      const reserveA = await simpleSwap.reserveA();
      const reserveB = await simpleSwap.reserveB();

      const expectedAmountOut = await simpleSwap.getAmountOut(amountIn, reserveA, reserveB);
      // Manually calculate expected amount out for verification
      const amountInWithFee = amountIn * BigInt(997);
      const numerator = amountInWithFee * reserveB;
      const denominator = (reserveA * BigInt(1000)) + amountInWithFee;
      const manualAmountOut = numerator / denominator;

      expect(expectedAmountOut).to.equal(manualAmountOut);
    });

    it("Should revert with INSUFFICIENT_INPUT_AMOUNT if amountIn is zero", async function () {
      const amountIn = ethers.parseEther("0");
      const reserveA = await simpleSwap.reserveA();
      const reserveB = await simpleSwap.reserveB();

      await expect(simpleSwap.getAmountOut(amountIn, reserveA, reserveB)).to.be.revertedWith("SimpleSwap: INSUFFICIENT_INPUT_AMOUNT");
    });

    it("Should revert with INSUFFICIENT_LIQUIDITY if reserves are zero", async function () {
      const amountIn = ethers.parseEther("10");
      const zeroReserve = ethers.parseEther("0");

      await expect(simpleSwap.getAmountOut(amountIn, zeroReserve, zeroReserve)).to.be.revertedWith("SimpleSwap: INSUFFICIENT_LIQUIDITY");
    });
  });

  describe("getPrice", function () {
    it("Should return the correct price of tokenA in terms of tokenB", async function () {
      // Add initial liquidity for getPrice tests
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("200"); // Different ratio for price test
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        owner.address,
        deadline
      );

      const price = await simpleSwap.getPrice(await myToken.getAddress(), await myToken2.getAddress());
      // Expected price: (reserveB * 1e18) / reserveA
      const expectedPrice = (ethers.parseEther("200") * BigInt(1e18)) / ethers.parseEther("100");
      expect(price).to.equal(expectedPrice);
    });

    it("Should revert with INVALID_TOKENS if incorrect tokens are provided", async function () {
      // Add initial liquidity to set tokenA and tokenB for this test
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await simpleSwap.getAddress(), amountA);
      await myToken2.connect(owner).approve(await simpleSwap.getAddress(), amountB);

      await simpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        owner.address,
        deadline
      );

      await expect(simpleSwap.getPrice(addr1.address, await myToken2.getAddress())).to.be.revertedWith("SimpleSwap: INVALID_TOKENS");
    });

    it("Should revert with INVALID_RESERVE if reserveA is zero", async function () {
      // Deploy a new SimpleSwap contract for this specific test to ensure clean state
      const SimpleSwapFactory = await ethers.getContractFactory("SimpleSwap");
      const newSimpleSwap = await SimpleSwapFactory.deploy();
      await newSimpleSwap.waitForDeployment();

      // Add initial liquidity to set tokenA and tokenB on the new contract
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

      await myToken.connect(owner).approve(await newSimpleSwap.getAddress(), amountA);
      await myToken2.connect(owner).approve(await newSimpleSwap.getAddress(), amountB);

      await newSimpleSwap.connect(owner).addLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        owner.address,
        deadline
      );

      // Remove all liquidity to make reserveA zero on the new contract
      const lpTokens = await newSimpleSwap.balanceOf(owner.address);
      await newSimpleSwap.connect(owner).removeLiquidity(
        await myToken.getAddress(),
        await myToken2.getAddress(),
        lpTokens,
        ethers.parseEther("0"),
        ethers.parseEther("0"),
        owner.address,
        deadline
      );

      // Now reserveA should be zero, and tokenA/tokenB are set on newSimpleSwap
      expect(await newSimpleSwap.reserveA()).to.equal(0);

      await expect(newSimpleSwap.getPrice(await myToken.getAddress(), await myToken2.getAddress())).to.be.revertedWith("SimpleSwap: INVALID_RESERVE");
    });
  });
});
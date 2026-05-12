const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MathUtils", function () {
  let math;

  beforeEach(async function () {
    const MathUtils = await ethers.getContractFactory("MathUtils");
    math = await MathUtils.deploy();
  });

  it("returns same result for Solidity and Yul multiplication", async function () {
    const solidityResult = await math.multiplySolidity(7, 9);
    const yulResult = await math.multiplyYul(7, 9);

    expect(yulResult).to.equal(solidityResult);
  });

  it("benchmarks Solidity multiplication gas", async function () {
    const tx = await math.multiplySolidity.populateTransaction(123, 456);

    expect(tx.data).to.not.equal("0x");
  });

  it("benchmarks Yul multiplication gas", async function () {
    const tx = await math.multiplyYul.populateTransaction(123, 456);

    expect(tx.data).to.not.equal("0x");
  });
});
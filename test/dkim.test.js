const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BN } = require('@openzeppelin/test-helpers');
const fs = require("fs");
const path = require("path");

describe("DKIM", function() {
  let dkim;

  before(async function() {
    const DKIM = await ethers.getContractFactory("DKIM");
    dkim = await DKIM.deploy();
    await dkim.deployed();
  });

  it("verify raw Gmail", async function() {
    let message = fs.readFileSync(path.join(__dirname, "data", "test-gmail.eml"));
    let verification = await dkim.verify(message.toString());
    expect(verification.success.toString()).to.be.equal("1");
    expect(verification.domain).to.be.equal("gmail.com");


    let gasEstimate = await dkim.estimateGas.verify(message.toString());
    console.log("Gas Estimate:", gasEstimate.toString());
  });

  it("verify raw YahooMail", async function() {
    let message = fs.readFileSync(path.join(__dirname, "data", "test-yahoo.eml"));
    let verification = await dkim.verify(message.toString());
    expect(verification.success.toString()).to.be.equal("1");
    expect(verification.domain).to.be.equal("yahoo.com");
  });

  it("verify raw ProtonMail", async function() {
    let message = fs.readFileSync(path.join(__dirname, "data", "test-proton.eml"));
    let verification = await dkim.verify(message.toString());
    expect(verification.success.toString()).to.be.equal("1");
    expect(verification.domain).to.be.equal("protonmail.com");
  });

  it("verify raw Outlook", async function() {
    let message = fs.readFileSync(path.join(__dirname, "data", "test-outlook.eml"));
    let verification = await dkim.verify(message.toString());
    expect(verification.success.toString()).to.be.equal("1");
    expect(verification.domain).to.be.equal("outlook.com");
  });

  it("verify Gmail with utf-8, whitespace sequences", async function() {
    let message = fs.readFileSync(path.join(__dirname, "data", "test-utf8.eml"));
    let verification = await dkim.verify(message.toString());
    expect(verification.success.toString()).to.be.equal("1");
    expect(verification.domain).to.be.equal("gmail.com");
  });
});

// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable reason-string */

import "./TokenPaymaster.sol";

/**
 * A sample paymaster that define itself as a token to pay for gas.
 * The paymaster IS the token to use, since a paymaster cannot use an external contract.
 * Also, the exchange rate has to be fixed, since it can't reference an external Uniswap or other exchange contract.
 * subclass should override "getTokenValueOfEth to provide actual token exchange rate, settable by the owner.
 * Known Limitation: this paymaster is exploitable when put into a batch with multiple ops (of different accounts):
 * - while a single op can't exploit the paymaster (if postOp fails to withdraw the tokens, the user's op is reverted,
 *   and then we know we can withdraw the tokens), multiple ops with different senders (all using this paymaster)
 *   in a batch can withdraw funds from 2nd and further ops, forcing the paymaster itself to pay (from its deposit)
 * - Possible workarounds are either use a more complex paymaster scheme (e.g. the DepositPaymaster) or
 *   to whitelist the account and the called method ids.
 */
contract SWTokenPaymaster is TokenPaymaster {

    uint256 private tokenValueOfEth;

    constructor(address accountFactory, string memory _symbol, IEntryPoint _entryPoint)
    TokenPaymaster(accountFactory, _symbol, _entryPoint) {
        tokenValueOfEth = 100;
    }


    /**
     * transfer paymaster ownership.
     * owner of this paymaster is allowed to withdraw funds (tokens transferred to this paymaster's balance)
     * when changing owner, the old owner's withdrawal rights are revoked.
     */
    function transferOwnership(address newOwner) public override virtual onlyOwner {
        super.transferOwnership(newOwner);
    }

    function getTokenValueOfEth(uint256 valueEth) internal view override virtual returns (uint256 valueToken) {
        return valueEth * tokenValueOfEth / 100;
    }

    function setTokenValueOfEth(uint256 _tokenValueOfEth) external onlyOwner {
        tokenValueOfEth = _tokenValueOfEth;
    }

}

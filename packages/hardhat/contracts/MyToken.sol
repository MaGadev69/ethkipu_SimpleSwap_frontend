// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MyToken
 * @author Gasquez_Jonatan
 * @notice A basic ERC20 token with a minting function.
 */
contract MyToken is ERC20 {
    constructor(uint amount) ERC20("MyToken", "MTK") {
        // Mint initial supply to the deployer
        _mint(msg.sender, amount * 10 ** decimals());
    }

    function mint(uint amount) public {
        _mint(msg.sender, amount * 10 ** decimals());
    }
}
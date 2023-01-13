// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUsdcToken is ERC20 {
    constructor() ERC20("Mock USDC", "MUSDC") {
        _mint(msg.sender, 100_000_000 ether);
    }

    // function decimals() public view virtual override returns (uint8) {
    //     return 8;
    // }
}

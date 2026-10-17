// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Tollbooth} from "../Tollbooth.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// @notice Local-only deploy: mock USDC + Tollbooth on anvil, with test balances minted.
///   anvil &
///   forge script contracts/script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
/// Env (optional): FUND_A, FUND_B, FUND_C — extra addresses to mint 100 USDC to (e.g. your demo agents).
contract DeployLocal is Script {
    function run() external {
        // anvil default account #0
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address owner = vm.addr(pk);

        vm.startBroadcast(pk);
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        Tollbooth tollbooth = new Tollbooth(address(usdc), owner, 50, owner);

        usdc.mint(owner, 1_000e6);
        address a = vm.envOr("FUND_A", address(0));
        address b = vm.envOr("FUND_B", address(0));
        address c = vm.envOr("FUND_C", address(0));
        if (a != address(0)) { usdc.mint(a, 100e6); payable(a).transfer(1 ether); }
        if (b != address(0)) { usdc.mint(b, 100e6); payable(b).transfer(1 ether); }
        if (c != address(0)) { usdc.mint(c, 100e6); payable(c).transfer(1 ether); }
        vm.stopBroadcast();

        console.log("USDC      ", address(usdc));
        console.log("Tollbooth ", address(tollbooth));
    }
}

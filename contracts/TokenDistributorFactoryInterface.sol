pragma solidity ^0.4.24;

contract TokenDistributorFactoryInterface {
    function registerTransfer(address from, address to, uint256 tokensToTransfer, uint256 currentPhaseNumber) public;
}

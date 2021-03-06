pragma solidity ^0.4.24;

import "./StandardToken.sol";
import "./Ownable.sol";


contract DemoToken is StandardToken, Ownable {
    uint8 public decimals = 18;

    event Issue(address recipient, uint256 amount);

    constructor() public {
        owner = msg.sender;
        balances[msg.sender] = (10 ** uint256(decimals)).mul(1000);
    }

    function issue(address recipient, uint256 amount) public onlyOwner {
        balances[recipient] = balances[recipient].add(amount);
        totalSupply = totalSupply.add(amount);
        emit Issue(recipient, amount);
    }
}

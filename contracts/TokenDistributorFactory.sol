pragma solidity ^0.4.24;

import "./TokenDistributor.sol";
import "./Ownable.sol";

contract TokenDistributorFactory is Ownable {

    string public constant name = "TokenDistributorFactory";

    address public tokenAddress;
    address[] private registeredContracts;
    mapping(address => bool) private contracts;

    event Created(address newContractAddress, address tokenAddress, uint256 tokensInitAmount, uint256 phaseInitDate, uint256 phaseInterval);
    event Transfer(address from, address to, uint256 value, uint256 phaseNumber);

    modifier onlyContract {
        require(isContractOwner(msg.sender), "Only contract can invoke this method");
        _;
    }

    constructor(address _tokenAddress) public {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
    }

    function create(address _owner, uint256 _tokensInitAmount, uint256 phaseInitDate, uint256 phaseInterval) public returns (address) {
        address tokenDistributor = new TokenDistributor(address(this), tokenAddress, _owner, _tokensInitAmount, phaseInitDate, phaseInterval);

        contracts[address(tokenDistributor)] = true;
        registeredContracts.push(address(tokenDistributor));
        emit Created(address(tokenDistributor), tokenAddress, _tokensInitAmount, phaseInitDate, phaseInterval);

        return address(tokenDistributor);
    }

    function registerTransfer(address from, address to, uint256 tokensToTransfer, uint256 currentPhaseNumber) public onlyContract {
        emit Transfer(from, to, tokensToTransfer, currentPhaseNumber);
    }

    function getRegisteredContracts() public view onlyOwner returns (address[]) {
        return registeredContracts;
    }

    function isContractOwner(address _address) private view returns (bool) {
        return contracts[_address];
    }
}

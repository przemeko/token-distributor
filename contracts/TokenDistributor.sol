pragma solidity ^0.4.24;

import "./Ownable.sol";
import "./ERC20Basic.sol";
import "./TokenDistributorFactoryInterface.sol";
import "./SafeMath.sol";

contract TokenDistributor is Ownable {
    using SafeMath for uint256;

    string public constant name = "TokenDistributor";
    uint256 public constant phaseTotalNumber = 8;

    struct Phase {
        uint256 number;
        uint256 activationDate;
        uint256 percent;
        bool transfered;
    }

    ERC20Basic public token;
    TokenDistributorFactoryInterface public tokenDistributorFactory;
    Phase[] public phases;
    address public factoryAddress;
    uint256 public tokensInitAmount;
    uint256 public phaseInitDate; // in seconds since the epoch
    uint256 public phaseInterval; // in seconds

    constructor(
        address _factoryAddress, 
        address _tokenAddress, 
        address _owner, 
        uint256 _tokensInitAmount, 
        uint256 _phaseInitDate, 
        uint256 _phaseInterval
        ) public {
        tokenDistributorFactory = TokenDistributorFactoryInterface(_factoryAddress);
        token = ERC20Basic(_tokenAddress);
        owner = _owner;
        tokensInitAmount = _tokensInitAmount;
        phaseInitDate = _phaseInitDate;
        phaseInterval = _phaseInterval;

        generatePhases();
    }

    function transferTo(address to) public onlyOwner returns (bool) {
        require(to != address(0), "Don't transfer to zero address");

        uint256 tokensToTransfer = tokensAvailableForCurrentPhase();
        require(tokensToTransfer > 0, "Dont't tarnsfer 0");

        bool transferResult = token.transfer(to, tokensToTransfer);

        uint256 currentPhaseNumber = getCurrentPhaseNumber();
        for (uint256 i = 0; i < currentPhaseNumber; i++) {
            phases[i].transfered = true;
        }
        
        tokenDistributorFactory.registerTransfer(address(this), to, tokensToTransfer, currentPhaseNumber);

        return transferResult;
    }

    function transfer(address to) public onlyOwner returns (bool) {
        return transferTo(to);
    }

    function tokensAvailableForCurrentPhase() public view returns (uint256) {
        uint256 lastPhaseActivationDate = phases[phaseTotalNumber.sub(1)].activationDate;

        if (now >= lastPhaseActivationDate) {
            uint256 tokensAmount = token.balanceOf(address(this));
            return tokensAmount;
        }

        uint256 percent = calculateCurrentPhasePercents();

        return tokensInitAmount.mul(percent).div(100);
    }

    function calculateCurrentPhasePercents() public view returns (uint256) {
        uint256 currentPhaseNumber = getCurrentPhaseNumber();
        uint256 percentSum = 0;
        for (uint i = 0; i < currentPhaseNumber; i++) {
            Phase memory phase = phases[i];
            if (!phase.transfered) {
                percentSum = percentSum.add(phase.percent);
            }
        }

        return percentSum;
    }

    function generatePhases() private returns (bool) {
        uint256 percent = 10;
        for (uint256 i = 1; i <= phaseTotalNumber; i++) {
            if (i >= phaseTotalNumber.sub(1)) {
                percent = 20;
            }
            uint256 activationDate = phaseInitDate + i.sub(1) * phaseInterval;
            phases.push(Phase(i, activationDate, percent, false));
        }
    }

    function getCurrentPhaseNumber() public view returns (uint256) {
        Phase memory phase;
        uint256 currentPhaseNumber = 0;
        for (uint i = phaseTotalNumber.sub(1); i >= 0; i--) {
            phase = phases[i];
            if (now >= phase.activationDate) {
                currentPhaseNumber = phase.number;
                break;
            }
        }

        return currentPhaseNumber;
    }

    function getPhaseByNumber(uint256 phaseNumber) public view returns (
        uint256 number,
        uint256 activationDate,
        uint256 percent,
        bool transfered
    )
    {
        require(phaseNumber >= 1 && phaseNumber <= phaseTotalNumber, "Wrong phase number");

        Phase memory phase = phases[phaseNumber.sub(1)];

        number = phase.number;
        activationDate = phase.activationDate;
        percent = phase.percent;
        transfered = phase.transfered;
    }
}

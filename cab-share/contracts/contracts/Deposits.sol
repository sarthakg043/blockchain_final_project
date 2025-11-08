// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Deposits
 * @notice Manages rider and driver deposits with slashing and refund mechanisms
 * @dev Holds collateral to deter spam and fake traffic per paper specifications
 */
contract Deposits is Ownable, ReentrancyGuard {
    // Minimum deposit amounts
    uint256 public minRiderDeposit;
    uint256 public minDriverDeposit;

    // Deposit tracking
    mapping(bytes32 => uint256) public riderDeposits;    // rideId => amount
    mapping(bytes32 => uint256) public driverDeposits;   // rideId => amount
    mapping(address => uint256) public userBalances;     // user => available balance

    // Authorized contracts
    mapping(address => bool) public authorizedContracts;

    event DepositReceived(bytes32 indexed rideId, address indexed user, uint256 amount, bool isRider);
    event DepositRefunded(bytes32 indexed rideId, address indexed user, uint256 amount);
    event DepositSlashed(bytes32 indexed rideId, address indexed user, uint256 amount, string reason);
    event MinDepositUpdated(uint256 minRider, uint256 minDriver);

    constructor(uint256 _minRiderDeposit, uint256 _minDriverDeposit) Ownable(msg.sender) {
        minRiderDeposit = _minRiderDeposit;
        minDriverDeposit = _minDriverDeposit;
    }

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized");
        _;
    }

    function authorizeContract(address contractAddr) external onlyOwner {
        authorizedContracts[contractAddr] = true;
    }

    function revokeContract(address contractAddr) external onlyOwner {
        authorizedContracts[contractAddr] = false;
    }

    function updateMinDeposits(uint256 _minRider, uint256 _minDriver) external onlyOwner {
        minRiderDeposit = _minRider;
        minDriverDeposit = _minDriver;
        emit MinDepositUpdated(_minRider, _minDriver);
    }

    /**
     * @notice Lock rider deposit for a ride
     */
    function lockRiderDeposit(bytes32 rideId, address rider) external payable onlyAuthorized {
        require(msg.value >= minRiderDeposit, "Insufficient rider deposit");
        riderDeposits[rideId] = msg.value;
        emit DepositReceived(rideId, rider, msg.value, true);
    }

    /**
     * @notice Lock driver deposit for a ride proposal
     */
    function lockDriverDeposit(bytes32 rideId, address driver) external payable onlyAuthorized {
        require(msg.value >= minDriverDeposit, "Insufficient driver deposit");
        driverDeposits[rideId] = msg.value;
        emit DepositReceived(rideId, driver, msg.value, false);
    }

    /**
     * @notice Refund rider deposit on successful completion
     */
    function refundRiderDeposit(bytes32 rideId, address rider) external onlyAuthorized nonReentrant {
        uint256 amount = riderDeposits[rideId];
        require(amount > 0, "No deposit to refund");
        
        riderDeposits[rideId] = 0;
        userBalances[rider] += amount;
        
        emit DepositRefunded(rideId, rider, amount);
    }

    /**
     * @notice Refund driver deposit on successful completion
     */
    function refundDriverDeposit(bytes32 rideId, address driver) external onlyAuthorized nonReentrant {
        uint256 amount = driverDeposits[rideId];
        require(amount > 0, "No deposit to refund");
        
        driverDeposits[rideId] = 0;
        userBalances[driver] += amount;
        
        emit DepositRefunded(rideId, driver, amount);
    }

    /**
     * @notice Slash rider deposit for spam or violation
     */
    function slashRiderDeposit(bytes32 rideId, address rider, string calldata reason) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        uint256 amount = riderDeposits[rideId];
        require(amount > 0, "No deposit to slash");
        
        riderDeposits[rideId] = 0;
        // Slashed funds stay in contract (could be redistributed or burned)
        
        emit DepositSlashed(rideId, rider, amount, reason);
    }

    /**
     * @notice Slash driver deposit for fake proposals or abandonment
     */
    function slashDriverDeposit(bytes32 rideId, address driver, string calldata reason) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        uint256 amount = driverDeposits[rideId];
        require(amount > 0, "No deposit to slash");
        
        driverDeposits[rideId] = 0;
        
        emit DepositSlashed(rideId, driver, amount, reason);
    }

    /**
     * @notice Allow users to withdraw their available balance
     */
    function withdraw() external nonReentrant {
        uint256 amount = userBalances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        userBalances[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Get deposit amounts for a ride
     */
    function getDeposits(bytes32 rideId) external view returns (uint256 rider, uint256 driver) {
        return (riderDeposits[rideId], driverDeposits[rideId]);
    }
}

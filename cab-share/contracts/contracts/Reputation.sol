// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IReputation.sol";

/**
 * @title Reputation
 * @notice Manages reputation scores for riders, drivers, and admins
 * @dev Implements paper's reputation update rules:
 *      - Driver: Score_D(i+1) = Score_D(i) + F where F ∈ {-1, 1, 2}
 *      - Admin: Score_admin(i+1) = Score_admin(i) ± 1
 */
contract Reputation is IReputation, Ownable {
    // Base score for new users
    uint256 public constant BASE_SCORE = 100;
    uint256 public constant MIN_SCORE = 0;
    uint256 public constant MAX_SCORE = 1000;

    // Reputation scores
    mapping(address => uint256) public driverScores;
    mapping(address => uint256) public riderScores;
    mapping(address => uint256) public adminScores;

    // Track if user has been initialized
    mapping(address => bool) public initialized;

    // Prevent double rating
    mapping(bytes32 => mapping(address => bool)) public hasRated;

    // Authorized contracts
    mapping(address => bool) public authorizedContracts;

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function authorizeContract(address contractAddr) external onlyOwner {
        authorizedContracts[contractAddr] = true;
    }

    function revokeContract(address contractAddr) external onlyOwner {
        authorizedContracts[contractAddr] = false;
    }

    /**
     * @notice Initialize user with base score
     */
    function _initializeUser(address user) internal {
        if (!initialized[user]) {
            driverScores[user] = BASE_SCORE;
            riderScores[user] = BASE_SCORE;
            adminScores[user] = BASE_SCORE;
            initialized[user] = true;
        }
    }

    /**
     * @notice Rate a driver after ride completion
     * @param rideId Unique ride identifier
     * @param driver Driver address
     * @param F Score delta: -1 (bad), 1 (good), 2 (excellent)
     */
    function rateDriver(bytes32 rideId, address driver, int8 F) external override onlyAuthorized {
        require(F == -1 || F == 1 || F == 2, "Invalid F value");
        require(!hasRated[rideId][driver], "Already rated");
        
        _initializeUser(driver);
        hasRated[rideId][driver] = true;

        uint256 currentScore = driverScores[driver];
        uint256 newScore;

        if (F < 0) {
            // Decrease score, but don't go below MIN_SCORE
            uint256 decrease = uint256(-int256(F));
            newScore = currentScore > decrease ? currentScore - decrease : MIN_SCORE;
        } else {
            // Increase score, but don't exceed MAX_SCORE
            uint256 increase = uint256(int256(F));
            newScore = currentScore + increase;
            if (newScore > MAX_SCORE) {
                newScore = MAX_SCORE;
            }
        }

        driverScores[driver] = newScore;
        emit DriverRated(driver, rideId, F, newScore);
    }

    /**
     * @notice Rate a rider after ride completion
     * @param rideId Unique ride identifier
     * @param rider Rider address
     * @param F Score delta: -1 (bad), 1 (good), 2 (excellent)
     */
    function rateRider(bytes32 rideId, address rider, int8 F) external override onlyAuthorized {
        require(F == -1 || F == 1 || F == 2, "Invalid F value");
        require(!hasRated[rideId][rider], "Already rated");
        
        _initializeUser(rider);
        hasRated[rideId][rider] = true;

        uint256 currentScore = riderScores[rider];
        uint256 newScore;

        if (F < 0) {
            uint256 decrease = uint256(-int256(F));
            newScore = currentScore > decrease ? currentScore - decrease : MIN_SCORE;
        } else {
            uint256 increase = uint256(int256(F));
            newScore = currentScore + increase;
            if (newScore > MAX_SCORE) {
                newScore = MAX_SCORE;
            }
        }

        riderScores[rider] = newScore;
        emit RiderRated(rider, rideId, F, newScore);
    }

    /**
     * @notice Update admin score based on service quality
     * @param admin Admin/delegate address
     * @param success True if service was successful, false otherwise
     */
    function bumpAdminScore(address admin, bool success) external override onlyAuthorized {
        _initializeUser(admin);
        
        uint256 currentScore = adminScores[admin];
        uint256 newScore;

        if (success) {
            newScore = currentScore + 1;
            if (newScore > MAX_SCORE) {
                newScore = MAX_SCORE;
            }
        } else {
            newScore = currentScore > 1 ? currentScore - 1 : MIN_SCORE;
        }

        adminScores[admin] = newScore;
        emit AdminScoreUpdated(admin, success, newScore);
    }

    /**
     * @notice Get driver reputation score
     */
    function getDriverScore(address driver) external view override returns (uint256) {
        return initialized[driver] ? driverScores[driver] : BASE_SCORE;
    }

    /**
     * @notice Get rider reputation score
     */
    function getRiderScore(address rider) external view override returns (uint256) {
        return initialized[rider] ? riderScores[rider] : BASE_SCORE;
    }

    /**
     * @notice Get admin reputation score
     */
    function getAdminScore(address admin) external view override returns (uint256) {
        return initialized[admin] ? adminScores[admin] : BASE_SCORE;
    }

    /**
     * @notice Calculate selection weight for DPoS voting
     * @dev Weight is based on combined reputation (could be customized)
     */
    function getSelectionWeight(address user) external view override returns (uint256) {
        if (!initialized[user]) {
            return BASE_SCORE;
        }
        
        // Weight = average of driver and admin scores (can be adjusted)
        uint256 driverScore = driverScores[user];
        uint256 adminScore = adminScores[user];
        
        return (driverScore + adminScore) / 2;
    }
}

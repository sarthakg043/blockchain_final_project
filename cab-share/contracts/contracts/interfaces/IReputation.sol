// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReputation {
    event DriverRated(address indexed driver, bytes32 indexed rideId, int8 score, uint256 newReputation);
    event RiderRated(address indexed rider, bytes32 indexed rideId, int8 score, uint256 newReputation);
    event AdminScoreUpdated(address indexed admin, bool success, uint256 newScore);

    function getDriverScore(address driver) external view returns (uint256);
    function getRiderScore(address rider) external view returns (uint256);
    function getAdminScore(address admin) external view returns (uint256);
    
    function rateDriver(bytes32 rideId, address driver, int8 F) external;
    function rateRider(bytes32 rideId, address rider, int8 F) external;
    function bumpAdminScore(address admin, bool success) external;
    
    function getSelectionWeight(address user) external view returns (uint256);
}

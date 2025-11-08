// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/Types.sol";

interface ICabShareCore {
    event RideRequested(
        bytes32 indexed rideId,
        address indexed rider,
        bytes32 ctHash,
        string policyRef
    );
    
    event DriverProposed(
        bytes32 indexed rideId,
        address indexed driver,
        uint256 deposit
    );
    
    event DriverMatched(
        bytes32 indexed rideId,
        address indexed driver,
        address indexed matcher
    );
    
    event ReencryptionSubmitted(
        bytes32 indexed rideId,
        bytes32 ctPrimeHash
    );
    
    event RideCompleted(
        bytes32 indexed rideId,
        address rider,
        address driver
    );
    
    event Disputed(
        bytes32 indexed rideId,
        address indexed initiator,
        string reason
    );

    function createRide(
        bytes32 rideId,
        bytes32 ctHash,
        Types.AccessPolicy calldata policy
    ) external payable;

    function proposeRide(
        bytes32 rideId,
        Types.DriverTrip calldata trip
    ) external payable;

    function matchDriver(
        bytes32 rideId,
        address driver
    ) external;

    function submitReencryption(
        bytes32 rideId,
        bytes32 ctPrimeHash
    ) external;

    function completeRide(bytes32 rideId) external;
    
    function disputeRide(bytes32 rideId, string calldata reason) external;

    function getRide(bytes32 rideId) external view returns (Types.Ride memory);
}

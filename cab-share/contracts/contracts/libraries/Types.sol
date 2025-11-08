// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Types {
    // Access policy structure encoding (M, p) reference
    struct AccessPolicy {
        bytes32 policyHash;      // Hash of the policy matrix M and mapping p
        string policyRef;        // IPFS hash or reference to full policy JSON
        uint256 earliestArrival; // Constraint: earliest acceptable arrival time
        uint256 latestArrival;   // Constraint: latest acceptable arrival time
        uint8 minAttributes;     // Minimum number of attributes required
    }

    // Driver trip information
    struct DriverTrip {
        uint256 departureTime;
        string destination;
        uint256 arrivalTime;
        string route;
        uint8 availableSeats;
        uint256 pricePerSeat;
        bytes32[] attributes;    // Hashed driver attributes for matching
    }

    // Ride request state
    struct Ride {
        bytes32 rideId;
        address rider;
        address driver;
        bytes32 ctHash;          // Hash of encrypted ciphertext CT
        bytes32 ctPrimeHash;     // Hash of re-encrypted ciphertext CT'
        AccessPolicy policy;
        uint256 riderDeposit;
        uint256 driverDeposit;
        RideStatus status;
        uint256 createdAt;
        uint256 matchedAt;
        uint256 completedAt;
    }

    enum RideStatus {
        Requested,      // Rider created request
        Proposed,       // Driver(s) proposed
        Matched,        // Admin/delegate matched driver
        Reencrypted,    // CT' submitted
        InProgress,     // Ride started
        Completed,      // Ride finished
        Disputed,       // Dispute raised
        Cancelled       // Cancelled
    }

    // Driver proposal
    struct Proposal {
        address driver;
        DriverTrip trip;
        uint256 deposit;
        uint256 proposedAt;
        bool active;
    }

    // Rating structure
    struct Rating {
        address rater;
        address ratee;
        int8 score;      // F ∈ {-1, 1, 2}
        uint256 timestamp;
        bytes32 rideId;
    }

    // DPoS delegate candidate
    struct Delegate {
        address account;
        uint256 reputation;
        uint256 votes;
        bool isActive;
        uint256 registeredAt;
    }

    // Batch validation for DPoS consensus
    struct RideBatch {
        bytes32 batchId;
        bytes32[] rideIds;
        address proposer;
        uint256 positiveVotes;
        uint256 negativeVotes;
        uint256 timestamp;
        bool validated;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ICabShareCore.sol";
import "./interfaces/IReputation.sol";
import "./interfaces/IDPoSDelegateHub.sol";
import "./Deposits.sol";
import "./libraries/Types.sol";

/**
 * @title CabShareCore
 * @notice Core contract for decentralized cab-sharing with CP-ABE encryption
 * @dev Orchestrates ride lifecycle: request → proposal → matching → re-encryption → completion
 */
contract CabShareCore is ICabShareCore, Ownable, ReentrancyGuard {
    IReputation public reputationContract;
    IDPoSDelegateHub public dposHub;
    Deposits public depositsContract;

    // Ride storage
    mapping(bytes32 => Types.Ride) public rides;
    mapping(bytes32 => Types.Proposal[]) public rideProposals;
    mapping(bytes32 => bool) public rideExists;

    // Access control
    mapping(address => bool) public isAdmin;
    
    // Rating window
    uint256 public constant RATING_WINDOW = 24 hours;
    mapping(bytes32 => uint256) public ratingDeadline;

    modifier onlyAdminOrDelegate() {
        require(
            isAdmin[msg.sender] || 
            dposHub.isDelegate(msg.sender) || 
            msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    modifier rideInStatus(bytes32 rideId, Types.RideStatus status) {
        require(rides[rideId].status == status, "Invalid ride status");
        _;
    }

    constructor(
        address _reputationContract,
        address _dposHub,
        address _depositsContract
    ) Ownable(msg.sender) {
        reputationContract = IReputation(_reputationContract);
        dposHub = IDPoSDelegateHub(_dposHub);
        depositsContract = Deposits(_depositsContract);
    }

    function setAdmin(address admin, bool status) external onlyOwner {
        isAdmin[admin] = status;
    }

    /**
     * @notice Rider creates encrypted ride request
     * @param rideId Unique ride identifier (PTID in paper)
     * @param ctHash Hash of encrypted ciphertext CT
     * @param policy Access policy encoding (M, p) reference
     */
    function createRide(
        bytes32 rideId,
        bytes32 ctHash,
        Types.AccessPolicy calldata policy
    ) external payable override nonReentrant {
        require(!rideExists[rideId], "Ride already exists");
        require(ctHash != bytes32(0), "Invalid CT hash");
        require(bytes(policy.policyRef).length > 0, "Invalid policy reference");

        // Lock rider deposit
        depositsContract.lockRiderDeposit{value: msg.value}(rideId, msg.sender);

        rides[rideId] = Types.Ride({
            rideId: rideId,
            rider: msg.sender,
            driver: address(0),
            ctHash: ctHash,
            ctPrimeHash: bytes32(0),
            policy: policy,
            riderDeposit: msg.value,
            driverDeposit: 0,
            status: Types.RideStatus.Requested,
            createdAt: block.timestamp,
            matchedAt: 0,
            completedAt: 0
        });

        rideExists[rideId] = true;

        emit RideRequested(rideId, msg.sender, ctHash, policy.policyRef);
    }

    /**
     * @notice Driver proposes to fulfill ride
     * @param rideId Ride identifier
     * @param trip Driver trip details with attributes
     */
    function proposeRide(
        bytes32 rideId,
        Types.DriverTrip calldata trip
    ) external payable override nonReentrant rideInStatus(rideId, Types.RideStatus.Requested) {
        require(msg.sender != rides[rideId].rider, "Rider cannot propose");
        require(trip.attributes.length > 0, "No attributes provided");

        // Lock driver deposit
        depositsContract.lockDriverDeposit{value: msg.value}(rideId, msg.sender);

        rideProposals[rideId].push(Types.Proposal({
            driver: msg.sender,
            trip: trip,
            deposit: msg.value,
            proposedAt: block.timestamp,
            active: true
        }));

        // Update ride status to Proposed if first proposal
        if (rides[rideId].status == Types.RideStatus.Requested) {
            rides[rideId].status = Types.RideStatus.Proposed;
        }

        emit DriverProposed(rideId, msg.sender, msg.value);
    }

    /**
     * @notice Admin/delegate matches driver after verifying attribute satisfaction
     * @param rideId Ride identifier
     * @param driver Selected driver address
     */
    function matchDriver(
        bytes32 rideId,
        address driver
    ) external override onlyAdminOrDelegate rideInStatus(rideId, Types.RideStatus.Proposed) {
        require(driver != address(0), "Invalid driver");
        
        // Verify driver has an active proposal
        bool hasProposal = false;
        Types.Proposal[] storage proposals = rideProposals[rideId];
        
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].driver == driver && proposals[i].active) {
                hasProposal = true;
                break;
            }
        }
        
        require(hasProposal, "Driver has no active proposal");

        // Update ride
        rides[rideId].driver = driver;
        rides[rideId].status = Types.RideStatus.Matched;
        rides[rideId].matchedAt = block.timestamp;

        // Refund deposits of non-selected drivers
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].driver != driver && proposals[i].active) {
                proposals[i].active = false;
                depositsContract.refundDriverDeposit(rideId, proposals[i].driver);
            }
        }

        emit DriverMatched(rideId, driver, msg.sender);
    }

    /**
     * @notice Admin submits re-encrypted ciphertext CT' for matched driver
     * @param rideId Ride identifier
     * @param ctPrimeHash Hash of re-encrypted ciphertext CT'
     */
    function submitReencryption(
        bytes32 rideId,
        bytes32 ctPrimeHash
    ) external override onlyAdminOrDelegate rideInStatus(rideId, Types.RideStatus.Matched) {
        require(ctPrimeHash != bytes32(0), "Invalid CT' hash");

        rides[rideId].ctPrimeHash = ctPrimeHash;
        rides[rideId].status = Types.RideStatus.Reencrypted;

        emit ReencryptionSubmitted(rideId, ctPrimeHash);
    }

    /**
     * @notice Mark ride as in progress (driver verified and decrypted)
     */
    function startRide(bytes32 rideId) external rideInStatus(rideId, Types.RideStatus.Reencrypted) {
        require(msg.sender == rides[rideId].driver, "Only matched driver");

        rides[rideId].status = Types.RideStatus.InProgress;
    }

    /**
     * @notice Complete ride and open rating window
     * @param rideId Ride identifier
     */
    function completeRide(bytes32 rideId) external override nonReentrant {
        Types.Ride storage ride = rides[rideId];
        require(
            ride.status == Types.RideStatus.InProgress || 
            ride.status == Types.RideStatus.Reencrypted,
            "Invalid status"
        );
        require(
            msg.sender == ride.rider || msg.sender == ride.driver,
            "Only rider or driver"
        );

        ride.status = Types.RideStatus.Completed;
        ride.completedAt = block.timestamp;
        ratingDeadline[rideId] = block.timestamp + RATING_WINDOW;

        emit RideCompleted(rideId, ride.rider, ride.driver);
    }

    /**
     * @notice Rate driver after ride completion
     */
    function rateDriver(bytes32 rideId, int8 F) external {
        Types.Ride storage ride = rides[rideId];
        require(ride.status == Types.RideStatus.Completed, "Ride not completed");
        require(msg.sender == ride.rider, "Only rider can rate driver");
        require(block.timestamp <= ratingDeadline[rideId], "Rating window closed");

        reputationContract.rateDriver(rideId, ride.driver, F);
    }

    /**
     * @notice Rate rider after ride completion
     */
    function rateRider(bytes32 rideId, int8 F) external {
        Types.Ride storage ride = rides[rideId];
        require(ride.status == Types.RideStatus.Completed, "Ride not completed");
        require(msg.sender == ride.driver, "Only driver can rate rider");
        require(block.timestamp <= ratingDeadline[rideId], "Rating window closed");

        reputationContract.rateRider(rideId, ride.rider, F);
    }

    /**
     * @notice Finalize ride and process payouts after rating window
     */
    function finalizeRide(bytes32 rideId) external nonReentrant {
        Types.Ride storage ride = rides[rideId];
        require(ride.status == Types.RideStatus.Completed, "Ride not completed");
        require(block.timestamp > ratingDeadline[rideId], "Rating window still open");

        // Refund deposits
        depositsContract.refundRiderDeposit(rideId, ride.rider);
        depositsContract.refundDriverDeposit(rideId, ride.driver);

        // Transfer payment to driver (in real system, would handle payment logic here)
        // For now, deposits serve as collateral only
    }

    /**
     * @notice Raise dispute on ride
     */
    function disputeRide(bytes32 rideId, string calldata reason) external override {
        Types.Ride storage ride = rides[rideId];
        require(
            msg.sender == ride.rider || msg.sender == ride.driver,
            "Only rider or driver"
        );
        require(
            ride.status != Types.RideStatus.Cancelled &&
            ride.status != Types.RideStatus.Disputed,
            "Invalid status"
        );

        ride.status = Types.RideStatus.Disputed;

        emit Disputed(rideId, msg.sender, reason);
    }

    /**
     * @notice Cancel ride (before matching)
     */
    function cancelRide(bytes32 rideId) external nonReentrant {
        Types.Ride storage ride = rides[rideId];
        require(msg.sender == ride.rider, "Only rider can cancel");
        require(
            ride.status == Types.RideStatus.Requested ||
            ride.status == Types.RideStatus.Proposed,
            "Cannot cancel at this stage"
        );

        ride.status = Types.RideStatus.Cancelled;

        // Refund rider deposit
        depositsContract.refundRiderDeposit(rideId, ride.rider);

        // Refund all driver deposits
        Types.Proposal[] storage proposals = rideProposals[rideId];
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].active) {
                proposals[i].active = false;
                depositsContract.refundDriverDeposit(rideId, proposals[i].driver);
            }
        }
    }

    /**
     * @notice Slash deposits for spam or violation
     */
    function slashDeposits(bytes32 rideId, bool slashRider, bool slashDriver, string calldata reason) 
        external 
        onlyOwner 
        nonReentrant 
    {
        Types.Ride storage ride = rides[rideId];
        
        if (slashRider) {
            depositsContract.slashRiderDeposit(rideId, ride.rider, reason);
        }
        
        if (slashDriver && ride.driver != address(0)) {
            depositsContract.slashDriverDeposit(rideId, ride.driver, reason);
        }
    }

    /**
     * @notice Get ride details
     */
    function getRide(bytes32 rideId) external view override returns (Types.Ride memory) {
        require(rideExists[rideId], "Ride does not exist");
        return rides[rideId];
    }

    /**
     * @notice Get all proposals for a ride
     */
    function getProposals(bytes32 rideId) external view returns (Types.Proposal[] memory) {
        return rideProposals[rideId];
    }

    /**
     * @notice Get active proposals count
     */
    function getActiveProposalsCount(bytes32 rideId) external view returns (uint256) {
        Types.Proposal[] storage proposals = rideProposals[rideId];
        uint256 count = 0;
        
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].active) {
                count++;
            }
        }
        
        return count;
    }
}

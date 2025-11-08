// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDPoSDelegateHub.sol";
import "./interfaces/IReputation.sol";
import "./libraries/Types.sol";

/**
 * @title DPoSDelegateHub
 * @notice Implements DPoS-style consensus for application-level validation
 * @dev Selects top 101 delegates by reputation-weighted votes; batch acceptance requires >2n+1 approvals
 */
contract DPoSDelegateHub is IDPoSDelegateHub, Ownable {
    IReputation public reputationContract;

    uint256 public constant MAX_DELEGATES = 101;
    uint256 public constant APPROVAL_THRESHOLD_NUMERATOR = 2;
    uint256 public constant APPROVAL_THRESHOLD_DENOMINATOR = 3;
    
    uint256 public minimumReputationThreshold; // μ threshold from paper
    uint256 public currentRound;

    // Delegate management
    mapping(address => Types.Delegate) public delegates;
    address[] public delegateList;
    mapping(address => bool) public isDelegateRegistered;

    // Voting
    mapping(address => address) public voterToDelegate; // voter => delegate they support
    mapping(address => uint256) public delegateVoteCount;

    // Batch validation
    mapping(bytes32 => Types.RideBatch) public batches;
    mapping(bytes32 => mapping(address => bool)) public hasVotedOnBatch;

    address public currentMasterNode;
    uint256 public masterNodeIndex;

    // Authorized contracts
    mapping(address => bool) public authorizedContracts;

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier onlyDelegate() {
        require(isDelegateRegistered[msg.sender] && delegates[msg.sender].isActive, "Not an active delegate");
        _;
    }

    constructor(address _reputationContract, uint256 _minReputationThreshold) Ownable(msg.sender) {
        reputationContract = IReputation(_reputationContract);
        minimumReputationThreshold = _minReputationThreshold;
        currentRound = 1;
    }

    function authorizeContract(address contractAddr) external onlyOwner {
        authorizedContracts[contractAddr] = true;
    }

    function setMinimumReputationThreshold(uint256 threshold) external onlyOwner {
        minimumReputationThreshold = threshold;
    }

    /**
     * @notice Register as a delegate candidate
     */
    function registerDelegate() external override {
        require(!isDelegateRegistered[msg.sender], "Already registered");
        
        uint256 reputation = reputationContract.getSelectionWeight(msg.sender);
        require(reputation >= minimumReputationThreshold, "Reputation below threshold");

        delegates[msg.sender] = Types.Delegate({
            account: msg.sender,
            reputation: reputation,
            votes: 0,
            isActive: true,
            registeredAt: block.timestamp
        });

        delegateList.push(msg.sender);
        isDelegateRegistered[msg.sender] = true;

        emit DelegateRegistered(msg.sender, reputation);
        
        _updateTopDelegates();
    }

    /**
     * @notice Vote for a delegate using reputation-weighted voting
     */
    function voteForDelegate(address delegate) external override {
        require(isDelegateRegistered[delegate], "Not a registered delegate");
        require(delegates[delegate].isActive, "Delegate not active");

        // Remove previous vote if exists
        address previousDelegate = voterToDelegate[msg.sender];
        if (previousDelegate != address(0)) {
            uint256 previousWeight = reputationContract.getSelectionWeight(msg.sender);
            delegateVoteCount[previousDelegate] -= previousWeight;
            delegates[previousDelegate].votes -= previousWeight;
        }

        // Add new vote
        uint256 weight = reputationContract.getSelectionWeight(msg.sender);
        voterToDelegate[msg.sender] = delegate;
        delegateVoteCount[delegate] += weight;
        delegates[delegate].votes += weight;

        emit DelegateVoted(msg.sender, delegate, weight);
        
        _updateTopDelegates();
    }

    /**
     * @notice Update top 101 delegates and select master node
     */
    function _updateTopDelegates() internal {
        // Sort delegates by votes (simplified - in production use more efficient sorting)
        // For now, we mark top delegates as active based on vote count
        
        // This is a simplified version - production should use heap or other efficient structure
        if (delegateList.length > MAX_DELEGATES) {
            _selectTopDelegates();
        }
        
        _rotateMasterNode();
    }

    function _selectTopDelegates() internal {
        // Simplified: deactivate delegates with lowest votes if over MAX_DELEGATES
        // In production, implement proper sorting algorithm
        
        uint256 minVotes = type(uint256).max;
        address minDelegate;
        
        for (uint256 i = 0; i < delegateList.length; i++) {
            address delegateAddr = delegateList[i];
            if (delegates[delegateAddr].isActive && delegates[delegateAddr].votes < minVotes) {
                minVotes = delegates[delegateAddr].votes;
                minDelegate = delegateAddr;
            }
        }
        
        if (minDelegate != address(0)) {
            delegates[minDelegate].isActive = false;
        }
    }

    /**
     * @notice Rotate master node among top delegates
     */
    function _rotateMasterNode() internal {
        address[] memory topDelegates = getTopDelegates();
        if (topDelegates.length > 0) {
            masterNodeIndex = (masterNodeIndex + 1) % topDelegates.length;
            currentMasterNode = topDelegates[masterNodeIndex];
            emit MasterNodeSelected(currentMasterNode, currentRound);
        }
    }

    /**
     * @notice Get list of top active delegates
     */
    function getTopDelegates() public view override returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active delegates
        for (uint256 i = 0; i < delegateList.length; i++) {
            if (delegates[delegateList[i]].isActive) {
                activeCount++;
            }
        }

        uint256 resultSize = activeCount > MAX_DELEGATES ? MAX_DELEGATES : activeCount;
        address[] memory topDelegates = new address[](resultSize);
        uint256 index = 0;

        // Collect active delegates
        for (uint256 i = 0; i < delegateList.length && index < resultSize; i++) {
            if (delegates[delegateList[i]].isActive) {
                topDelegates[index] = delegateList[i];
                index++;
            }
        }

        return topDelegates;
    }

    /**
     * @notice Check if address is an active delegate
     */
    function isDelegate(address account) external view override returns (bool) {
        return isDelegateRegistered[account] && delegates[account].isActive;
    }

    /**
     * @notice Propose a batch of ride state changes
     */
    function proposeBatch(bytes32 batchId, bytes32[] calldata rideIds) external override onlyDelegate {
        require(batches[batchId].proposer == address(0), "Batch already exists");
        require(rideIds.length > 0, "Empty batch");

        batches[batchId] = Types.RideBatch({
            batchId: batchId,
            rideIds: rideIds,
            proposer: msg.sender,
            positiveVotes: 0,
            negativeVotes: 0,
            timestamp: block.timestamp,
            validated: false
        });

        emit BatchProposed(batchId, msg.sender, rideIds.length);
    }

    /**
     * @notice Validate a proposed batch (delegates vote)
     * @param batchId Batch identifier
     * @param approve True to approve, false to reject
     */
    function validateBatch(bytes32 batchId, bool approve) external override onlyDelegate {
        Types.RideBatch storage batch = batches[batchId];
        require(batch.proposer != address(0), "Batch does not exist");
        require(!batch.validated, "Batch already validated");
        require(!hasVotedOnBatch[batchId][msg.sender], "Already voted");

        hasVotedOnBatch[batchId][msg.sender] = true;

        if (approve) {
            batch.positiveVotes++;
        } else {
            batch.negativeVotes++;
        }

        // Check if we have enough votes to finalize
        address[] memory topDelegates = getTopDelegates();
        uint256 totalDelegates = topDelegates.length;
        uint256 requiredApprovals = (totalDelegates * APPROVAL_THRESHOLD_NUMERATOR) / APPROVAL_THRESHOLD_DENOMINATOR + 1;

        if (batch.positiveVotes >= requiredApprovals) {
            batch.validated = true;
            emit BatchValidated(batchId, true, batch.positiveVotes, batch.negativeVotes);
            
            // Bump proposer's admin score on success
            reputationContract.bumpAdminScore(batch.proposer, true);
        } else if (batch.negativeVotes > totalDelegates - requiredApprovals) {
            // Batch rejected
            batch.validated = true;
            emit BatchValidated(batchId, false, batch.positiveVotes, batch.negativeVotes);
            
            // Penalize proposer's admin score on failure
            reputationContract.bumpAdminScore(batch.proposer, false);
        }
    }

    /**
     * @notice Get current master node for the round
     */
    function getCurrentMasterNode() external view override returns (address) {
        return currentMasterNode;
    }

    /**
     * @notice Check if batch was approved
     */
    function isBatchApproved(bytes32 batchId) external view returns (bool) {
        Types.RideBatch memory batch = batches[batchId];
        if (!batch.validated) return false;
        
        address[] memory topDelegates = getTopDelegates();
        uint256 totalDelegates = topDelegates.length;
        uint256 requiredApprovals = (totalDelegates * APPROVAL_THRESHOLD_NUMERATOR) / APPROVAL_THRESHOLD_DENOMINATOR + 1;
        
        return batch.positiveVotes >= requiredApprovals;
    }

    /**
     * @notice Advance to next round
     */
    function advanceRound() external onlyOwner {
        currentRound++;
        _rotateMasterNode();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/Types.sol";

interface IDPoSDelegateHub {
    event DelegateRegistered(address indexed delegate, uint256 reputation);
    event DelegateVoted(address indexed voter, address indexed delegate, uint256 weight);
    event BatchProposed(bytes32 indexed batchId, address indexed proposer, uint256 rideCount);
    event BatchValidated(bytes32 indexed batchId, bool approved, uint256 positiveVotes, uint256 negativeVotes);
    event MasterNodeSelected(address indexed masterNode, uint256 round);

    function registerDelegate() external;
    function voteForDelegate(address delegate) external;
    function getTopDelegates() external view returns (address[] memory);
    function isDelegate(address account) external view returns (bool);
    
    function proposeBatch(bytes32 batchId, bytes32[] calldata rideIds) external;
    function validateBatch(bytes32 batchId, bool approve) external;
    function getCurrentMasterNode() external view returns (address);
}

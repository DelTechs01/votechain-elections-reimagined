// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/MinimalForwarder.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Voting is MinimalForwarder {
    // Struct for candidate
    struct Candidate {
        uint id;
        uint voteCount;
    }

    // Struct for voter
    struct Voter {
        bool hasVoted;
        uint votedCandidateId;
    }

    // Admin (Safe wallet address)
    address public admin;

    // Election timing
    uint public electionStart;
    uint public electionEnd;

    // Merkle root for KYC-verified voters
    bytes32 public merkleRoot;

    // Mappings
    mapping(uint => Candidate) public candidates;
    mapping(address => Voter) public voters;
    mapping(address => uint256) public nonces;

    // Candidate count
    uint public candidateCount;

    // Events
    event CandidateAdded(uint indexed id);
    event VoteCast(address indexed voter, uint indexed candidateId, uint voteCount);
    event ElectionEnded(uint timestamp);
    event MerkleRootUpdated(bytes32 merkleRoot);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier duringElection() {
        require(block.timestamp >= electionStart && block.timestamp <= electionEnd, "Election not active");
        _;
    }

    modifier notVoted(address voter) {
        require(!voters[voter].hasVoted, "Already voted");
        _;
    }

    constructor(uint _durationInSeconds, bytes32 _merkleRoot) MinimalForwarder() {
        admin = msg.sender;
        electionStart = block.timestamp;
        electionEnd = block.timestamp + _durationInSeconds;
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    // Update Merkle root (admin only)
    function updateMerkleRoot(bytes32 _newMerkleRoot) external onlyAdmin {
        merkleRoot = _newMerkleRoot;
        emit MerkleRootUpdated(_newMerkleRoot);
    }

    // Add candidate (admin only)
    function addCandidate() external onlyAdmin {
        require(block.timestamp < electionStart, "Election started");
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, 0);
        emit CandidateAdded(candidateCount);
    }

    // Verify voter using Merkle proof
    function verifyVoter(bytes32[] calldata _merkleProof, bytes32 _leaf) internal view returns (bool) {
        bytes32 computedHash = _leaf;
        for (uint i = 0; i < _merkleProof.length; i++) {
            bytes32 proofElement = _merkleProof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == merkleRoot;
    }

    // Cast vote
    function vote(address voter, uint _candidateId, bytes32[] calldata _merkleProof) external duringElection notVoted(voter) {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        bytes32 leaf = keccak256(abi.encodePacked(voter));
        require(verifyVoter(_merkleProof, leaf), "Not a verified voter");

        voters[voter] = Voter(true, _candidateId);
        candidates[_candidateId].voteCount++;

        emit VoteCast(voter, _candidateId, candidates[_candidateId].voteCount);
    }

    // Meta-transaction support
    function executeMetaTransaction(
        address userAddress,
        bytes memory functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) external returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(userAddress, address(this), functionSignature, nonces[userAddress]));
        address signer = ECDSA.recover(ECDSA.toEthSignedMessageHash(messageHash), sigV, sigR, sigS);
        require(signer == userAddress, "Invalid signature");

        nonces[userAddress]++;
        (bool success, bytes memory result) = address(this).call(functionSignature);
        require(success, "Function call failed");

        return result;
    }

    // Renamed to avoid conflict with MinimalForwarder.getNonce
    function getVotingNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    // Get candidate details
    function getCandidate(uint _id) external view returns (uint id, uint voteCount) {
        require(_id > 0 && _id <= candidateCount, "Invalid candidate");
        Candidate memory candidate = candidates[_id];
        return (candidate.id, candidate.voteCount);
    }

    // End election
    function endElection() external onlyAdmin {
        require(block.timestamp > electionEnd, "Election not ended");
        emit ElectionEnded(block.timestamp);
    }
}
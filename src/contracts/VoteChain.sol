
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract VoteChain {
    using ECDSA for bytes32;

    // For meta transactions
    mapping(address => uint256) private nonces;
    
    // Domain separator for EIP-712
    bytes32 private immutable DOMAIN_SEPARATOR;
    
    // Voter registration and voting data
    struct Voter {
        bool isRegistered;
        mapping(string => bool) hasVotedForPosition;
    }
    
    struct Candidate {
        uint256 id;
        string name;
        string party;
        string position;
        uint256 voteCount;
        bool isActive;  // Can be set to false if candidate is disqualified
    }
    
    struct Position {
        string name;
        string description;
        bool isActive;
    }
    
    struct Election {
        uint256 startTime;
        uint256 endTime;
        bool resultsPublished;
        bool realTimeResults;  // If true, results are visible in real-time
    }
    
    address public admin;
    Election public election;
    
    mapping(address => Voter) public voters;
    mapping(uint256 => Candidate) public candidates;
    mapping(string => bool) public positions;
    uint256 public candidateCount;
    string[] public positionsList;
    
    event VoteCast(address indexed voter, uint256 candidateId, string position);
    event CandidateAdded(uint256 candidateId, string name, string position);
    event CandidateDisqualified(uint256 candidateId);
    event VoterRegistered(address voterAddress);
    event PositionAdded(string position);
    event ElectionPeriodSet(uint256 startTime, uint256 endTime);
    event ResultsPublished(bool published);
    event RealTimeResultsSet(bool enabled);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier electionActive() {
        require(
            block.timestamp >= election.startTime && 
            block.timestamp <= election.endTime, 
            "Election is not active"
        );
        _;
    }
    
    constructor() {
        admin = msg.sender;
        // Initialize the domain separator for EIP-712
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("VoteChain")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }
    
    // Meta transaction functions
    function getNonce(address user) public view returns (uint256) {
        return nonces[user];
    }
    
    function executeMetaTransaction(
        address userAddress,
        bytes memory functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public returns (bytes memory) {
        require(userAddress != address(0), "Invalid user address");
        
        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encodePacked(userAddress, functionSignature, nonces[userAddress]))
            )
        );
        
        address signer = ecrecover(hash, sigV, sigR, sigS);
        require(signer == userAddress, "Signature verification failed");
        
        nonces[userAddress]++;
        
        // Execute the function call
        (bool success, bytes memory returnData) = address(this).call(
            abi.encodePacked(functionSignature, abi.encode(userAddress))
        );
        require(success, "Function call failed");
        
        return returnData;
    }
    
    // Admin functions
    function setElectionPeriod(uint256 _startTime, uint256 _endTime) public onlyAdmin {
        require(_startTime < _endTime, "Invalid time period");
        election.startTime = _startTime;
        election.endTime = _endTime;
        emit ElectionPeriodSet(_startTime, _endTime);
    }
    
    function setResultsPublished(bool _published) public onlyAdmin {
        election.resultsPublished = _published;
        emit ResultsPublished(_published);
    }
    
    function setRealTimeResults(bool _enabled) public onlyAdmin {
        election.realTimeResults = _enabled;
        emit RealTimeResultsSet(_enabled);
    }
    
    function addPosition(string memory _position, string memory _description) public onlyAdmin {
        require(!positions[_position], "Position already exists");
        positions[_position] = true;
        positionsList.push(_position);
        emit PositionAdded(_position);
    }
    
    function registerVoter(address _voterAddress) public onlyAdmin {
        voters[_voterAddress].isRegistered = true;
        emit VoterRegistered(_voterAddress);
    }
    
    function addCandidate(string memory _name, string memory _party, string memory _position) public onlyAdmin {
        require(positions[_position], "Position does not exist");
        
        candidateCount++;
        candidates[candidateCount] = Candidate(
            candidateCount,
            _name,
            _party,
            _position,
            0,
            true
        );
        emit CandidateAdded(candidateCount, _name, _position);
    }
    
    function disqualifyCandidate(uint256 _candidateId) public onlyAdmin {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate ID");
        candidates[_candidateId].isActive = false;
        emit CandidateDisqualified(_candidateId);
    }
    
    // Voter functions
    function vote(uint256 _candidateId, string memory _position) public electionActive {
        require(voters[msg.sender].isRegistered, "Voter is not registered");
        require(!voters[msg.sender].hasVotedForPosition[_position], "Voter already voted for this position");
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate ID");
        require(keccak256(abi.encodePacked(candidates[_candidateId].position)) == keccak256(abi.encodePacked(_position)), "Candidate is not running for this position");
        require(candidates[_candidateId].isActive, "This candidate has been disqualified");
        
        candidates[_candidateId].voteCount++;
        voters[msg.sender].hasVotedForPosition[_position] = true;
        
        emit VoteCast(msg.sender, _candidateId, _position);
    }
    
    // View functions
    function getVoterStatus(address _voterAddress, string memory _position) public view returns(bool isRegistered, bool hasVoted) {
        Voter storage voter = voters[_voterAddress];
        return (voter.isRegistered, voter.hasVotedForPosition[_position]);
    }
    
    function isAdmin(address _address) public view returns(bool) {
        return _address == admin;
    }
    
    function canViewResults(address _voterAddress) public view returns(bool) {
        // Results can be viewed if:
        // 1. They are published by admin OR
        // 2. Real-time results are enabled OR
        // 3. The voter has voted in at least one position
        
        if (election.resultsPublished) {
            return true;
        }
        
        if (election.realTimeResults) {
            return true;
        }
        
        // Check if voter has voted in any position
        for (uint i = 0; i < positionsList.length; i++) {
            if (voters[_voterAddress].hasVotedForPosition[positionsList[i]]) {
                return true;
            }
        }
        
        return false;
    }
    
    function getElectionStatus() public view returns(uint256 startTime, uint256 endTime, bool resultsPublished, bool realTimeResults) {
        return (election.startTime, election.endTime, election.resultsPublished, election.realTimeResults);
    }
    
    function getPositions() public view returns(string[] memory) {
        return positionsList;
    }
}

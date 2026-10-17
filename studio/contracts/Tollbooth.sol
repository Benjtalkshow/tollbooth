// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract Tollbooth is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum EscrowType {
        SingleRelease,
        MultiRelease
    }

    enum MilestoneStatus {
        Pending,
        InProgress,
        Completed
    }

    struct Roles {
        address approver;
        address serviceProvider;
        address releaseSigner;
        address disputeResolver;
        address platformAddress;
        address receiver;
    }

    struct MilestoneInput {
        uint256 amount;
        address receiver;
    }

    struct Milestone {
        uint256 amount;
        address receiver;
        bytes32 evidenceHash;
        MilestoneStatus status;
        bool approved;
        bool released;
        bool disputed;
        bool resolved;
    }

    struct Distribution {
        address to;
        uint256 amount;
    }

    struct Escrow {
        EscrowType escrowType;
        Roles roles;
        uint256 amount;
        uint256 balance;
        uint256 platformFeeBps;
        uint16 snapshotFeeBps;
        address snapshotFeeRecipient;
        uint64 deadline;
        bytes32 engagementId;
        bool disputed;
        bool released;
        bool resolved;
    }

    error ZeroAddress();
    error InvalidFee();
    error InvalidEscrowType();
    error InvalidMilestoneCount();
    error MilestoneAmountZero();
    error MilestoneReceiverZero();
    error MilestoneAmountMismatch();
    error NotAuthorized();
    error EscrowAlreadyFunded();
    error OverFundingNotAllowed();
    error EscrowNotFunded();
    error EscrowAlreadyReleased();
    error EscrowAlreadyDisputed();
    error EscrowNotDisputed();
    error DisputesNotEnabled();
    error MilestoneAlreadyReleased();
    error MilestoneAlreadyDisputed();
    error MilestoneNotDisputed();
    error MilestoneNotApproved();
    error MilestonesNotAllApproved();
    error NotSingleRelease();
    error NotMultiRelease();
    error DeadlineNotReached();
    error NoDeadline();
    error EscrowIsDisputed();
    error MilestoneIsDisputed();
    error DistributionSumMismatch();
    error TooManyDistributions();
    error TooManyDepositors();
    error NothingToWithdraw();
    error ExceedsSurplus();
    error RescueAddressZero();
    error BalanceInsufficient();
    error DeadlineInPast();
    error PlatformFeeWithoutAddress();
    error EscrowNotReleased();

    event EscrowCreated(
        uint256 indexed escrowId,
        EscrowType escrowType,
        address indexed approver,
        address indexed serviceProvider,
        uint256 amount,
        bytes32 engagementId
    );
    event EscrowUpdated(uint256 indexed escrowId);
    event Deposited(uint256 indexed escrowId, address indexed depositor, uint256 amount, uint256 fundedTotal);
    event MilestoneStatusChanged(uint256 indexed escrowId, uint256 milestoneIndex, MilestoneStatus status, bytes32 evidenceHash);
    event MilestoneApproved(uint256 indexed escrowId, uint256 milestoneIndex, address indexed approver);
    event FundsReleased(
        uint256 indexed escrowId,
        address indexed receiver,
        uint256 netAmount,
        uint256 platformFee,
        uint256 protocolFee
    );
    event MilestoneReleased(
        uint256 indexed escrowId,
        uint256 milestoneIndex,
        address indexed receiver,
        uint256 netAmount,
        uint256 platformFee,
        uint256 protocolFee
    );
    event EscrowDisputed(uint256 indexed escrowId, address indexed by);
    event MilestoneDisputed(uint256 indexed escrowId, uint256 milestoneIndex, address indexed by);
    event DisputeResolved(uint256 indexed escrowId, address indexed resolver);
    event MilestoneDisputeResolved(uint256 indexed escrowId, uint256 milestoneIndex, address indexed resolver);
    event RemainingFundsWithdrawn(uint256 indexed escrowId);
    event RefundedAfterDeadline(uint256 indexed escrowId, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);
    event FeeUpdated(uint16 feeBps, address indexed feeRecipient);
    event FundsRescued(address indexed to, uint256 amount);

    address public immutable usdc;
    address public feeRecipient;
    uint16 public feeBps;

    uint256 private _escrowCounter;
    uint256 private _totalObligations;

    mapping(uint256 => Escrow) private _escrows;
    mapping(uint256 => Milestone[]) private _milestones;
    mapping(uint256 => uint256) private _fundedTotal;
    mapping(uint256 => mapping(address => uint256)) private _deposits;
    mapping(uint256 => address[]) private _depositors;
    mapping(address => uint256[]) private _escrowsByAddress;
    mapping(address => uint256) public pendingWithdrawals;

    mapping(address => mapping(uint256 => bool)) private _tracked;
    mapping(uint256 => mapping(address => bool)) private _isDepositor;

    /// @notice Initializes the escrow system.
    /// @param _usdc ERC-20 token address used for settlement.
    /// @param _initialOwner Initial owner for administrative controls.
    /// @param _feeBps Protocol fee in basis points (max 500).
    /// @param _feeRecipient Recipient address for protocol fees.
    constructor(address _usdc, address _initialOwner, uint16 _feeBps, address _feeRecipient) Ownable(_initialOwner) {
        if (_usdc == address(0) || _feeRecipient == address(0)) revert ZeroAddress();
        if (_feeBps > 500) revert InvalidFee();

        usdc = _usdc;
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
    }

    /// @notice Creates a new escrow.
    /// @param escrowType Escrow payout mode: single-release or multi-release.
    /// @param roles Role assignments used for approvals, release, disputes, and fee routing.
    /// @param amount Expected gross escrow amount.
    /// @param platformFeeBps Platform fee in basis points (max 5000).
    /// @param deadline Optional deadline timestamp (0 means no deadline).
    /// @param engagementId Off-chain engagement identifier.
    /// @param milestones Milestone configuration inputs.
    /// @return escrowId The created escrow identifier.
    function createEscrow(
        EscrowType escrowType,
        Roles calldata roles,
        uint256 amount,
        uint256 platformFeeBps,
        uint64 deadline,
        bytes32 engagementId,
        MilestoneInput[] calldata milestones
    ) external returns (uint256 escrowId) {
        uint256 normalizedAmount = _validateEscrowConfig(escrowType, roles, amount, platformFeeBps, deadline, milestones);

        escrowId = ++_escrowCounter;

        _escrows[escrowId] = Escrow({
            escrowType: escrowType,
            roles: roles,
            amount: normalizedAmount,
            balance: 0,
            platformFeeBps: platformFeeBps,
            snapshotFeeBps: feeBps,
            snapshotFeeRecipient: feeRecipient,
            deadline: deadline,
            engagementId: engagementId,
            disputed: false,
            released: false,
            resolved: false
        });

        Milestone[] storage list = _milestones[escrowId];
        uint256 length = milestones.length;
        for (uint256 i = 0; i < length; ++i) {
            address receiver = escrowType == EscrowType.SingleRelease ? roles.receiver : milestones[i].receiver;
            list.push(
                Milestone({
                    amount: milestones[i].amount,
                    receiver: receiver,
                    evidenceHash: bytes32(0),
                    status: MilestoneStatus.Pending,
                    approved: false,
                    released: false,
                    disputed: false,
                    resolved: false
                })
            );
        }

        _trackAddress(roles.approver, escrowId);
        _trackAddress(roles.serviceProvider, escrowId);
        _trackAddress(roles.releaseSigner, escrowId);
        _trackAddress(roles.disputeResolver, escrowId);
        _trackAddress(roles.platformAddress, escrowId);
        _trackAddress(roles.receiver, escrowId);

        emit EscrowCreated(escrowId, escrowType, roles.approver, roles.serviceProvider, normalizedAmount, engagementId);
    }

    /// @notice Funds an escrow by transferring USDC from caller into contract custody.
    /// @dev Only escrow participants can fund: approver, service provider, release signer, and platform address (when set).
    /// @param escrowId Escrow identifier.
    /// @param amount Amount to deposit.
    function fundEscrow(uint256 escrowId, uint256 amount) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.released || escrow.resolved) revert EscrowAlreadyReleased();
        if (escrow.disputed) revert EscrowIsDisputed();

        bool isAuthorized =
            msg.sender == escrow.roles.approver ||
            msg.sender == escrow.roles.serviceProvider ||
            msg.sender == escrow.roles.releaseSigner ||
            (escrow.roles.platformAddress != address(0) && msg.sender == escrow.roles.platformAddress);
        if (!isAuthorized) revert NotAuthorized();

        uint256 updatedFunded = _fundedTotal[escrowId] + amount;

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);

        _deposits[escrowId][msg.sender] += amount;
        _fundedTotal[escrowId] = updatedFunded;
        escrow.balance += amount;

        if (!_isDepositor[escrowId][msg.sender]) {
            address[] storage depositorList = _depositors[escrowId];
            if (depositorList.length >= 20) revert TooManyDepositors();
            _isDepositor[escrowId][msg.sender] = true;
            depositorList.push(msg.sender);
        }

        _totalObligations += amount;
        _trackAddress(msg.sender, escrowId);

        emit Deposited(escrowId, msg.sender, amount, updatedFunded);
    }

    /// @notice Updates an unfunded escrow's configuration.
    /// @param escrowId Escrow identifier.
    /// @param newRoles New role assignments.
    /// @param newPlatformFeeBps New platform fee in basis points.
    /// @param newDeadline New optional deadline.
    /// @param newEngagementId New off-chain engagement identifier.
    /// @param newMilestones New milestone configuration.
    function updateEscrow(
        uint256 escrowId,
        Roles calldata newRoles,
        uint256 newPlatformFeeBps,
        uint64 newDeadline,
        bytes32 newEngagementId,
        MilestoneInput[] calldata newMilestones
    ) external {
        Escrow storage escrow = _escrows[escrowId];

        address updater = escrow.roles.platformAddress != address(0) ? escrow.roles.platformAddress : escrow.roles.approver;
        if (msg.sender != updater) revert NotAuthorized();
        if (_fundedTotal[escrowId] != 0) revert EscrowAlreadyFunded();

        uint256 normalizedAmount = _validateEscrowConfig(
            escrow.escrowType,
            newRoles,
            escrow.escrowType == EscrowType.SingleRelease ? escrow.amount : 0,
            newPlatformFeeBps,
            newDeadline,
            newMilestones
        );

        escrow.roles = newRoles;
        escrow.platformFeeBps = newPlatformFeeBps;
        escrow.deadline = newDeadline;
        escrow.engagementId = newEngagementId;
        escrow.amount = normalizedAmount;

        delete _milestones[escrowId];
        Milestone[] storage list = _milestones[escrowId];
        uint256 length = newMilestones.length;
        for (uint256 i = 0; i < length; ++i) {
            address receiver = escrow.escrowType == EscrowType.SingleRelease ? newRoles.receiver : newMilestones[i].receiver;
            list.push(
                Milestone({
                    amount: newMilestones[i].amount,
                    receiver: receiver,
                    evidenceHash: bytes32(0),
                    status: MilestoneStatus.Pending,
                    approved: false,
                    released: false,
                    disputed: false,
                    resolved: false
                })
            );
        }

        _trackAddress(newRoles.approver, escrowId);
        _trackAddress(newRoles.serviceProvider, escrowId);
        _trackAddress(newRoles.releaseSigner, escrowId);
        _trackAddress(newRoles.disputeResolver, escrowId);
        _trackAddress(newRoles.platformAddress, escrowId);
        _trackAddress(newRoles.receiver, escrowId);

        emit EscrowUpdated(escrowId);
    }

    /// @notice Updates milestone progress state and optional evidence hash.
    /// @param escrowId Escrow identifier.
    /// @param idx Milestone index.
    /// @param newStatus New status to apply.
    /// @param evidenceHash Optional updated evidence hash.
    function changeMilestoneStatus(uint256 escrowId, uint256 idx, MilestoneStatus newStatus, bytes32 evidenceHash) external {
        Escrow storage escrow = _escrows[escrowId];
        if (msg.sender != escrow.roles.serviceProvider) revert NotAuthorized();

        Milestone storage milestone = _getMilestone(escrowId, idx);
        if (milestone.released || milestone.resolved) revert MilestoneAlreadyReleased();

        milestone.status = newStatus;
        if (evidenceHash != bytes32(0)) {
            milestone.evidenceHash = evidenceHash;
        }

        emit MilestoneStatusChanged(escrowId, idx, newStatus, evidenceHash);
    }

    /// @notice Marks a milestone as approved and optionally records evidence.
    /// @param escrowId Escrow identifier.
    /// @param idx Milestone index.
    /// @param evidenceHash Optional updated evidence hash.
    function approveMilestone(uint256 escrowId, uint256 idx, bytes32 evidenceHash) external {
        Escrow storage escrow = _escrows[escrowId];
        if (msg.sender != escrow.roles.approver) revert NotAuthorized();

        Milestone storage milestone = _getMilestone(escrowId, idx);
        if (milestone.released || milestone.resolved) revert MilestoneAlreadyReleased();

        milestone.approved = true;
        if (evidenceHash != bytes32(0)) {
            milestone.evidenceHash = evidenceHash;
        }

        emit MilestoneApproved(escrowId, idx, msg.sender);
    }

    /// @notice Releases a fully approved single-release escrow.
    /// @param escrowId Escrow identifier.
    function releaseFunds(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.escrowType != EscrowType.SingleRelease) revert NotSingleRelease();
        if (msg.sender != escrow.roles.releaseSigner) revert NotAuthorized();
        if (escrow.disputed) revert EscrowIsDisputed();
        if (escrow.released) revert EscrowAlreadyReleased();
        if (_fundedTotal[escrowId] == 0) revert EscrowNotFunded();

        Milestone[] storage list = _milestones[escrowId];
        uint256 length = list.length;
        for (uint256 i = 0; i < length; ++i) {
            if (!list[i].approved) revert MilestonesNotAllApproved();
        }

        if (escrow.balance < escrow.amount) revert BalanceInsufficient();

        (uint256 platformFee, uint256 protocolFee, uint256 netAmount) = _computeFees(
            escrow.amount,
            escrow.platformFeeBps,
            escrow.snapshotFeeBps
        );

        pendingWithdrawals[escrow.roles.receiver] += netAmount;
        _creditFees(escrow, platformFee, protocolFee);

        escrow.balance -= escrow.amount;
        escrow.released = true;

        Milestone[] storage ms = _milestones[escrowId];
        uint256 mLen = ms.length;
        for (uint256 i = 0; i < mLen; ++i) {
            if (!ms[i].released && !ms[i].resolved) {
                ms[i].released = true;
            }
        }

        emit FundsReleased(escrowId, escrow.roles.receiver, netAmount, platformFee, protocolFee);
    }

    /// @notice Releases one approved milestone from a multi-release escrow.
    /// @param escrowId Escrow identifier.
    /// @param idx Milestone index.
    function releaseMilestoneFunds(uint256 escrowId, uint256 idx) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.escrowType != EscrowType.MultiRelease) revert NotMultiRelease();
        if (msg.sender != escrow.roles.releaseSigner) revert NotAuthorized();
        if (escrow.disputed) revert EscrowIsDisputed();
        if (_fundedTotal[escrowId] == 0) revert EscrowNotFunded();

        Milestone storage milestone = _getMilestone(escrowId, idx);
        if (!milestone.approved) revert MilestoneNotApproved();
        if (milestone.released || milestone.resolved) revert MilestoneAlreadyReleased();
        if (milestone.disputed) revert MilestoneAlreadyDisputed();

        if (escrow.balance < milestone.amount) revert BalanceInsufficient();

        (uint256 platformFee, uint256 protocolFee, uint256 netAmount) = _computeFees(
            milestone.amount,
            escrow.platformFeeBps,
            escrow.snapshotFeeBps
        );

        pendingWithdrawals[milestone.receiver] += netAmount;
        _creditFees(escrow, platformFee, protocolFee);

        milestone.released = true;
        escrow.balance -= milestone.amount;

        if (_allMilestonesDone(escrowId)) {
            escrow.released = true;
        }

        emit MilestoneReleased(escrowId, idx, milestone.receiver, netAmount, platformFee, protocolFee);
    }

    /// @notice Raises a dispute on a single-release escrow.
    /// @param escrowId Escrow identifier.
    function disputeEscrow(uint256 escrowId) external {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.escrowType != EscrowType.SingleRelease) revert NotSingleRelease();

        bool isAuthorized =
            msg.sender == escrow.roles.approver ||
            msg.sender == escrow.roles.serviceProvider ||
            msg.sender == escrow.roles.releaseSigner;
        if (!isAuthorized) revert NotAuthorized();

        if (escrow.roles.disputeResolver == address(0)) revert DisputesNotEnabled();
        if (escrow.released || escrow.resolved) revert EscrowAlreadyReleased();
        if (escrow.disputed) revert EscrowAlreadyDisputed();

        escrow.disputed = true;

        emit EscrowDisputed(escrowId, msg.sender);
    }

    /// @notice Raises a dispute on one milestone of a multi-release escrow.
    /// @param escrowId Escrow identifier.
    /// @param idx Milestone index.
    function disputeMilestone(uint256 escrowId, uint256 idx) external {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.escrowType != EscrowType.MultiRelease) revert NotMultiRelease();

        bool isAuthorized =
            msg.sender == escrow.roles.approver ||
            msg.sender == escrow.roles.serviceProvider ||
            msg.sender == escrow.roles.releaseSigner;
        if (!isAuthorized) revert NotAuthorized();

        if (escrow.roles.disputeResolver == address(0)) revert DisputesNotEnabled();

        Milestone storage milestone = _getMilestone(escrowId, idx);
        if (milestone.released || milestone.resolved) revert MilestoneAlreadyReleased();
        if (milestone.disputed) revert MilestoneAlreadyDisputed();

        milestone.disputed = true;

        emit MilestoneDisputed(escrowId, idx, msg.sender);
    }

    /// @notice Resolves a single-release escrow dispute using explicit net distributions.
    /// @param escrowId Escrow identifier.
    /// @param distributions Recipients and net amounts that must sum to dispute net balance.
    function resolveDispute(uint256 escrowId, Distribution[] calldata distributions) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.escrowType != EscrowType.SingleRelease) revert NotSingleRelease();
        if (msg.sender != escrow.roles.disputeResolver) revert NotAuthorized();
        if (!escrow.disputed) revert EscrowNotDisputed();

        uint256 length = distributions.length;
        if (length > 10) revert TooManyDistributions();

        uint256 gross = escrow.balance;
        (uint256 platformFee, uint256 protocolFee, uint256 netAmount) = _computeFees(
            gross,
            escrow.platformFeeBps,
            escrow.snapshotFeeBps
        );

        uint256 distributed;
        for (uint256 i = 0; i < length; ++i) {
            address to = distributions[i].to;
            if (to == address(0)) revert ZeroAddress();
            uint256 amount = distributions[i].amount;
            pendingWithdrawals[to] += amount;
            distributed += amount;
        }

        if (distributed != netAmount) revert DistributionSumMismatch();

        _creditFees(escrow, platformFee, protocolFee);

        escrow.balance = 0;
        escrow.resolved = true;
        escrow.released = true;
        escrow.disputed = false;

        emit DisputeResolved(escrowId, msg.sender);
    }

    /// @notice Resolves a disputed milestone in a multi-release escrow using explicit net distributions.
    /// @param escrowId Escrow identifier.
    /// @param idx Milestone index.
    /// @param distributions Recipients and net amounts that must sum to milestone net balance.
    function resolveMilestoneDispute(
        uint256 escrowId,
        uint256 idx,
        Distribution[] calldata distributions
    ) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.escrowType != EscrowType.MultiRelease) revert NotMultiRelease();
        if (msg.sender != escrow.roles.disputeResolver) revert NotAuthorized();

        Milestone storage milestone = _getMilestone(escrowId, idx);
        if (!milestone.disputed) revert MilestoneNotDisputed();

        uint256 length = distributions.length;
        if (length > 10) revert TooManyDistributions();

        (uint256 platformFee, uint256 protocolFee, uint256 netAmount) = _computeFees(
            milestone.amount,
            escrow.platformFeeBps,
            escrow.snapshotFeeBps
        );

        uint256 distributed;
        for (uint256 i = 0; i < length; ++i) {
            address to = distributions[i].to;
            if (to == address(0)) revert ZeroAddress();
            uint256 amount = distributions[i].amount;
            pendingWithdrawals[to] += amount;
            distributed += amount;
        }

        if (distributed != netAmount) revert DistributionSumMismatch();

        _creditFees(escrow, platformFee, protocolFee);

        escrow.balance -= milestone.amount;
        milestone.resolved = true;
        milestone.released = true;
        milestone.disputed = false;

        if (_allMilestonesDone(escrowId)) {
            escrow.released = true;
        }

        emit MilestoneDisputeResolved(escrowId, idx, msg.sender);
    }

    /// @notice Withdraws residual escrow balance after full release lifecycle, without additional fees.
    /// @dev Callable by dispute resolver, approver, or release signer.
    /// @param escrowId Escrow identifier.
    /// @param distributions Exact balance distributions to credit.
    function withdrawRemainingFunds(uint256 escrowId, Distribution[] calldata distributions) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        bool authorizedWithdrawer = msg.sender == escrow.roles.disputeResolver
            || msg.sender == escrow.roles.approver
            || msg.sender == escrow.roles.releaseSigner;
        if (!authorizedWithdrawer) revert NotAuthorized();
        if (!escrow.released) revert EscrowNotReleased();
        if (escrow.balance == 0) revert BalanceInsufficient();

        uint256 length = distributions.length;
        if (length > 10) revert TooManyDistributions();

        uint256 currentBalance = escrow.balance;
        uint256 distributed;
        for (uint256 i = 0; i < length; ++i) {
            address to = distributions[i].to;
            if (to == address(0)) revert ZeroAddress();
            uint256 amount = distributions[i].amount;
            pendingWithdrawals[to] += amount;
            distributed += amount;
        }

        if (distributed != currentBalance) revert DistributionSumMismatch();

        escrow.balance = 0;

        emit RemainingFundsWithdrawn(escrowId);
    }

    /// @notice Refunds remaining escrow balance pro-rata to depositors after deadline.
    /// @param escrowId Escrow identifier.
    function refundAfterDeadline(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.deadline == 0) revert NoDeadline();
        if (block.timestamp < escrow.deadline) revert DeadlineNotReached();
        if (escrow.disputed) revert EscrowIsDisputed();
        if (escrow.balance == 0) revert BalanceInsufficient();

        if (escrow.escrowType == EscrowType.MultiRelease) {
            Milestone[] storage list = _milestones[escrowId];
            uint256 mLength = list.length;
            for (uint256 i = 0; i < mLength; ++i) {
                if (list[i].disputed) revert MilestoneIsDisputed();
            }
        }

        address[] storage depositorList = _depositors[escrowId];
        if (depositorList.length == 0 || _fundedTotal[escrowId] == 0) revert BalanceInsufficient();

        uint256 originalBalance = escrow.balance;
        uint256 totalFunded = _fundedTotal[escrowId];
        uint256 paid;

        uint256 dLength = depositorList.length;
        for (uint256 i = 0; i < dLength; ++i) {
            address depositor = depositorList[i];
            uint256 depositorAmount = _deposits[escrowId][depositor];
            uint256 share = (originalBalance * depositorAmount) / totalFunded;
            pendingWithdrawals[depositor] += share;
            paid += share;
        }

        uint256 dust = originalBalance - paid;
        if (dust > 0) {
            pendingWithdrawals[depositorList[0]] += dust;
        }

        escrow.balance = 0;
        escrow.released = true;

        Milestone[] storage milestones = _milestones[escrowId];
        uint256 length = milestones.length;
        for (uint256 i = 0; i < length; ++i) {
            Milestone storage milestone = milestones[i];
            if (!milestone.released && !milestone.resolved) {
                milestone.resolved = true;
            }
        }

        emit RefundedAfterDeadline(escrowId, originalBalance);
    }

    /// @notice Withdraws caller's pending USDC balance.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;
        _totalObligations -= amount;
        IERC20(usdc).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Updates protocol fee configuration for newly created escrows.
    /// @param bps New protocol fee in basis points (max 500).
    /// @param recipient New protocol fee recipient.
    function setFee(uint16 bps, address recipient) external onlyOwner {
        if (bps > 500) revert InvalidFee();
        if (recipient == address(0)) revert ZeroAddress();

        feeBps = bps;
        feeRecipient = recipient;

        emit FeeUpdated(bps, recipient);
    }

    /// @notice Rescues surplus USDC above tracked obligations.
    /// @param to Recipient of rescued funds.
    /// @param amount Amount to rescue.
    function rescueFunds(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert RescueAddressZero();

        uint256 balance = IERC20(usdc).balanceOf(address(this));
        uint256 surplus = balance > _totalObligations ? balance - _totalObligations : 0;
        if (amount > surplus) revert ExceedsSurplus();

        IERC20(usdc).safeTransfer(to, amount);

        emit FundsRescued(to, amount);
    }

    /// @notice Returns the escrow struct for an id.
    /// @param escrowId Escrow identifier.
    /// @return Escrow data.
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return _escrows[escrowId];
    }

    /// @notice Returns all milestones for an escrow.
    /// @param escrowId Escrow identifier.
    /// @return Milestone array.
    function getMilestones(uint256 escrowId) external view returns (Milestone[] memory) {
        return _milestones[escrowId];
    }

    /// @notice Returns role assignments for an escrow.
    /// @param escrowId Escrow identifier.
    /// @return Roles data.
    function getRoles(uint256 escrowId) external view returns (Roles memory) {
        return _escrows[escrowId].roles;
    }

    /// @notice Returns number of escrows created.
    /// @return Current escrow count.
    function escrowCount() external view returns (uint256) {
        return _escrowCounter;
    }

    /// @notice Returns escrow ids associated with an address.
    /// @param addr Address to query.
    /// @return Escrow id array.
    function escrowsByAddress(address addr) external view returns (uint256[] memory) {
        return _escrowsByAddress[addr];
    }

    /// @notice Returns total funded amount for an escrow.
    /// @param escrowId Escrow identifier.
    /// @return Total funded amount.
    function fundedTotal(uint256 escrowId) external view returns (uint256) {
        return _fundedTotal[escrowId];
    }

    /// @notice Returns deposited amount for a depositor in a given escrow.
    /// @param escrowId Escrow identifier.
    /// @param depositor Depositor address.
    /// @return Deposited amount.
    function depositOf(uint256 escrowId, address depositor) external view returns (uint256) {
        return _deposits[escrowId][depositor];
    }

    /// @notice Returns current total tracked obligations.
    /// @return Current obligations total.
    function totalObligations() external view returns (uint256) {
        return _totalObligations;
    }

    function _computeFees(
        uint256 gross,
        uint256 platformFeeBps,
        uint16 snapshotFeeBps
    ) internal pure returns (uint256 platformFee, uint256 protocolFee, uint256 net) {
        platformFee = (gross * platformFeeBps) / 10_000;
        protocolFee = (gross * snapshotFeeBps) / 10_000;
        net = gross - platformFee - protocolFee;
    }

    function _creditFees(Escrow storage escrow, uint256 platformFee, uint256 protocolFee) internal {
        if (platformFee > 0 && escrow.roles.platformAddress != address(0)) {
            pendingWithdrawals[escrow.roles.platformAddress] += platformFee;
        }

        if (protocolFee > 0 && escrow.snapshotFeeRecipient != address(0)) {
            pendingWithdrawals[escrow.snapshotFeeRecipient] += protocolFee;
        }
    }

    function _allMilestonesDone(uint256 escrowId) internal view returns (bool) {
        Milestone[] storage list = _milestones[escrowId];
        uint256 length = list.length;
        for (uint256 i = 0; i < length; ++i) {
            if (!list[i].released && !list[i].resolved) {
                return false;
            }
        }
        return true;
    }

    function _trackAddress(address addr, uint256 escrowId) internal {
        if (addr == address(0)) return;
        if (_tracked[addr][escrowId]) return;

        _tracked[addr][escrowId] = true;
        _escrowsByAddress[addr].push(escrowId);
    }

    function _validateEscrowConfig(
        EscrowType escrowType,
        Roles calldata roles,
        uint256 amount,
        uint256 platformFeeBps,
        uint64 deadline,
        MilestoneInput[] calldata milestones
    ) internal view returns (uint256 normalizedAmount) {
        if (uint8(escrowType) > uint8(EscrowType.MultiRelease)) revert InvalidEscrowType();

        if (roles.approver == address(0) || roles.serviceProvider == address(0) || roles.releaseSigner == address(0)) {
            revert ZeroAddress();
        }

        if (platformFeeBps > 5000) revert InvalidFee();
        if (platformFeeBps > 0 && roles.platformAddress == address(0)) revert PlatformFeeWithoutAddress();
        if (platformFeeBps + feeBps > 10_000) revert InvalidFee();

        uint256 milestonesLength = milestones.length;
        if (milestonesLength == 0 || milestonesLength > 10) revert InvalidMilestoneCount();

        if (deadline != 0 && deadline <= block.timestamp) revert DeadlineInPast();

        if (escrowType == EscrowType.SingleRelease) {
            if (amount == 0) revert MilestoneAmountZero();
            if (roles.receiver == address(0)) revert ZeroAddress();

            for (uint256 i = 0; i < milestonesLength; ++i) {
                if (milestones[i].amount != 0) revert MilestoneAmountMismatch();
            }

            normalizedAmount = amount;
        } else if (escrowType == EscrowType.MultiRelease) {
            uint256 total;
            for (uint256 i = 0; i < milestonesLength; ++i) {
                uint256 milestoneAmount = milestones[i].amount;
                if (milestoneAmount == 0) revert MilestoneAmountZero();
                if (milestones[i].receiver == address(0)) revert MilestoneReceiverZero();
                total += milestoneAmount;
            }

            if (total != amount) revert MilestoneAmountMismatch();
            normalizedAmount = total;
        } else {
            revert InvalidEscrowType();
        }
    }

    function _getMilestone(uint256 escrowId, uint256 idx) internal view returns (Milestone storage milestone) {
        Milestone[] storage list = _milestones[escrowId];
        if (idx >= list.length) revert InvalidMilestoneCount();
        milestone = list[idx];
    }
}

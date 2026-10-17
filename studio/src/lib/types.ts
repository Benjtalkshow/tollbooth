/**
 * Tollbooth v2 TypeScript types — mirrors the Solidity structs.
 */

export enum EscrowType {
  SingleRelease = 0,
  MultiRelease  = 1,
}

export enum MilestoneStatus {
  Pending    = 0,
  InProgress = 1,
  Completed  = 2,
}

export enum EscrowStatus {
  /** Not disputed, not released */
  Active    = 'active',
  Disputed  = 'disputed',
  Released  = 'released',
  Resolved  = 'resolved',
}

export interface Roles {
  approver:         `0x${string}`
  serviceProvider:  `0x${string}`
  releaseSigner:    `0x${string}`
  disputeResolver:  `0x${string}`
  platformAddress:  `0x${string}`
  receiver:         `0x${string}`
}

export interface Milestone {
  amount:           bigint
  receiver:         `0x${string}`
  evidenceHash:     `0x${string}`
  status:           MilestoneStatus
  approved:         boolean
  released:         boolean
  disputed:         boolean
  resolved:         boolean
}

export interface Escrow {
  escrowType:           EscrowType
  roles:                Roles
  amount:               bigint
  balance:              bigint
  platformFeeBps:       bigint
  snapshotFeeBps:       number
  snapshotFeeRecipient: `0x${string}`
  deadline:             bigint
  engagementId:         `0x${string}`
  disputed:             boolean
  released:             boolean
  resolved:             boolean
}

export interface Distribution {
  to:     `0x${string}`
  amount: bigint
}

export interface MilestoneInput {
  amount:   bigint
  receiver: `0x${string}`
}

/** Derived status label for UI display */
export function deriveEscrowStatus(e: Escrow): EscrowStatus {
  if (e.disputed)  return EscrowStatus.Disputed
  if (e.resolved)  return EscrowStatus.Resolved
  if (e.released)  return EscrowStatus.Released
  return EscrowStatus.Active
}

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  [MilestoneStatus.Pending]:    'Pending',
  [MilestoneStatus.InProgress]: 'In Progress',
  [MilestoneStatus.Completed]:  'Completed',
}

export const ESCROW_TYPE_LABELS: Record<EscrowType, string> = {
  [EscrowType.SingleRelease]: 'Single Release',
  [EscrowType.MultiRelease]:  'Multi Release',
}

/**
 * Decode custom Tollbooth contract errors into human-readable messages.
 */

const ERROR_MESSAGES: Record<string, string> = {
  ZeroAddress:               'Address cannot be zero.',
  InvalidFee:                'Fee exceeds the maximum allowed.',
  InvalidEscrowType:         'Invalid escrow type.',
  InvalidMilestoneCount:     'Milestones must be between 1 and 10.',
  MilestoneAmountZero:       'Milestone amounts must be greater than zero.',
  MilestoneReceiverZero:     'Each milestone must have a receiver address.',
  MilestoneAmountMismatch:   'Milestone amounts must sum to the total escrow amount.',
  NotAuthorized:             'You are not authorised to perform this action.',
  EscrowAlreadyFunded:       'Escrow has already been funded — updates are locked.',
  OverFundingNotAllowed:     'Deposit would exceed the escrow total.',
  EscrowNotFunded:           'Escrow has not been funded yet.',
  EscrowAlreadyReleased:     'Escrow has already been released.',
  EscrowAlreadyDisputed:     'Escrow is already disputed.',
  EscrowNotDisputed:         'Escrow is not currently disputed.',
  DisputesNotEnabled:        'This escrow has no dispute resolver — disputes are disabled.',
  MilestoneAlreadyReleased:  'This milestone has already been released.',
  MilestoneAlreadyDisputed:  'This milestone is already disputed.',
  MilestoneNotDisputed:      'This milestone is not currently disputed.',
  MilestoneNotApproved:      'This milestone has not been approved yet.',
  MilestonesNotAllApproved:  'All milestones must be approved before releasing funds.',
  NotSingleRelease:          'This function is only for Single Release escrows.',
  NotMultiRelease:           'This function is only for Multi Release escrows.',
  DeadlineNotReached:        'The deadline has not passed yet.',
  NoDeadline:                'This escrow has no deadline set.',
  EscrowIsDisputed:          'Escrow is currently disputed.',
  MilestoneIsDisputed:       'This milestone is currently disputed.',
  DistributionSumMismatch:   'Distribution amounts do not sum to the required net balance.',
  TooManyDistributions:      'Too many distribution entries (max 10).',
  TooManyDepositors:         'This escrow has reached the maximum number of depositors (20).',
  NothingToWithdraw:         'No pending balance to withdraw.',
  ExceedsSurplus:            'Cannot rescue more than the contract surplus.',
  RescueAddressZero:         'Rescue destination cannot be the zero address.',
  BalanceInsufficient:       'Escrow balance is insufficient for this operation.',
  DeadlineInPast:            'Deadline must be in the future.',
  PlatformFeeWithoutAddress: 'Platform fee requires a non-zero platform address.',
  EscrowNotReleased:         'Escrow has not been fully released yet.',
}

/** Parse a wagmi/viem error and return a clean user-facing message. */
export function parseContractError(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.'

  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)
  const lower   = message.toLowerCase()

  // User rejected
  if (lower.includes('user rejected') || lower.includes('user denied') || (error as {code?: number})?.code === 4001) {
    return 'Transaction cancelled.'
  }

  // Try to match a known custom error by name
  for (const [name, friendly] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(name)) return friendly
  }

  // Revert with reason
  const reasonMatch = message.match(/reason="([^"]+)"/)
  if (reasonMatch) return `Transaction failed: ${reasonMatch[1]}`

  const revertMatch = message.match(/reverted with reason string '([^']+)'/)
  if (revertMatch) return `Transaction failed: ${revertMatch[1]}`

  if (lower.includes('insufficient funds') || lower.includes('exceeds balance')) {
    return 'Insufficient USDC balance. Please add funds and try again.'
  }

  if (lower.includes('network') || lower.includes('timeout')) {
    return 'Network error. Check your connection and try again.'
  }

  if (lower.includes('reverted')) {
    return 'Transaction reverted. Please check your inputs and try again.'
  }

  return 'Something went wrong. Please try again.'
}

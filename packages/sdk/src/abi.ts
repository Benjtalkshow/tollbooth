// Generated from Arc Studio build artifact contracts/out/Tollbooth.sol/Tollbooth.json (Tollbooth v2)
// Do not edit by hand.
export const tollboothAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_usdc",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_initialOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_feeBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "_feeRecipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "acceptOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approveMilestone",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "idx",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "evidenceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "changeMilestoneStatus",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "idx",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newStatus",
        "type": "uint8",
        "internalType": "enum Tollbooth.MilestoneStatus"
      },
      {
        "name": "evidenceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createEscrow",
    "inputs": [
      {
        "name": "escrowType",
        "type": "uint8",
        "internalType": "enum Tollbooth.EscrowType"
      },
      {
        "name": "roles",
        "type": "tuple",
        "internalType": "struct Tollbooth.Roles",
        "components": [
          {
            "name": "approver",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "serviceProvider",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "releaseSigner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "disputeResolver",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "platformAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "receiver",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "platformFeeBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "engagementId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "milestones",
        "type": "tuple[]",
        "internalType": "struct Tollbooth.MilestoneInput[]",
        "components": [
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "receiver",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "depositOf",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "depositor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "disputeEscrow",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "disputeMilestone",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "idx",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "escrowCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "escrowsByAddress",
    "inputs": [
      {
        "name": "addr",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeRecipient",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fundEscrow",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fundedTotal",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEscrow",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Tollbooth.Escrow",
        "components": [
          {
            "name": "escrowType",
            "type": "uint8",
            "internalType": "enum Tollbooth.EscrowType"
          },
          {
            "name": "roles",
            "type": "tuple",
            "internalType": "struct Tollbooth.Roles",
            "components": [
              {
                "name": "approver",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "serviceProvider",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "releaseSigner",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "disputeResolver",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "platformAddress",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "receiver",
                "type": "address",
                "internalType": "address"
              }
            ]
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "balance",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "platformFeeBps",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "snapshotFeeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "snapshotFeeRecipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "deadline",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "engagementId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "disputed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "released",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "resolved",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getMilestones",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct Tollbooth.Milestone[]",
        "components": [
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "receiver",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "evidenceHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum Tollbooth.MilestoneStatus"
          },
          {
            "name": "approved",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "released",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "disputed",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "resolved",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoles",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Tollbooth.Roles",
        "components": [
          {
            "name": "approver",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "serviceProvider",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "releaseSigner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "disputeResolver",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "platformAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "receiver",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingOwner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingWithdrawals",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "refundAfterDeadline",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "releaseFunds",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "releaseMilestoneFunds",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "idx",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "rescueFunds",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resolveDispute",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "distributions",
        "type": "tuple[]",
        "internalType": "struct Tollbooth.Distribution[]",
        "components": [
          {
            "name": "to",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resolveMilestoneDispute",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "idx",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "distributions",
        "type": "tuple[]",
        "internalType": "struct Tollbooth.Distribution[]",
        "components": [
          {
            "name": "to",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setFee",
    "inputs": [
      {
        "name": "bps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "totalObligations",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateEscrow",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newRoles",
        "type": "tuple",
        "internalType": "struct Tollbooth.Roles",
        "components": [
          {
            "name": "approver",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "serviceProvider",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "releaseSigner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "disputeResolver",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "platformAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "receiver",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "name": "newPlatformFeeBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "newDeadline",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "newEngagementId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "newMilestones",
        "type": "tuple[]",
        "internalType": "struct Tollbooth.MilestoneInput[]",
        "components": [
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "receiver",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "usdc",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawRemainingFunds",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "distributions",
        "type": "tuple[]",
        "internalType": "struct Tollbooth.Distribution[]",
        "components": [
          {
            "name": "to",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Deposited",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "depositor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "fundedTotal",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeResolved",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "resolver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EscrowCreated",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "escrowType",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum Tollbooth.EscrowType"
      },
      {
        "name": "approver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "serviceProvider",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "engagementId",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EscrowDisputed",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "by",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EscrowUpdated",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FeeUpdated",
    "inputs": [
      {
        "name": "feeBps",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "feeRecipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FundsReleased",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "netAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "platformFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "protocolFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FundsRescued",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneApproved",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "approver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneDisputeResolved",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "resolver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneDisputed",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "by",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneReleased",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "netAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "platformFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "protocolFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneStatusChanged",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "status",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum Tollbooth.MilestoneStatus"
      },
      {
        "name": "evidenceHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RefundedAfterDeadline",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RemainingFundsWithdrawn",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "BalanceInsufficient",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DeadlineInPast",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DeadlineNotReached",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DisputesNotEnabled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DistributionSumMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EscrowAlreadyDisputed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EscrowAlreadyFunded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EscrowAlreadyReleased",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EscrowIsDisputed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EscrowNotDisputed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EscrowNotFunded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EscrowNotReleased",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExceedsSurplus",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidEscrowType",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidFee",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidMilestoneCount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestoneAlreadyDisputed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestoneAlreadyReleased",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestoneAmountMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestoneAmountZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestoneIsDisputed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestoneNotApproved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestoneNotDisputed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestoneReceiverZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MilestonesNotAllApproved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoDeadline",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAuthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotMultiRelease",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotSingleRelease",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToWithdraw",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OverFundingNotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "PlatformFeeWithoutAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RescueAddressZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "TooManyDepositors",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooManyDistributions",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const

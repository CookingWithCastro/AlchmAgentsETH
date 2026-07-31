/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/aae_solana.json`.
 */
export type AaeSolana = {
  address: '5QheuqaicKvPPRFEoEXwaE5xaFp7gauvJCfsjpQv8WzD'
  metadata: {
    name: 'aaeSolana'
    version: '0.1.0'
    spec: '0.1.0'
    description: 'AlchmAgentsEth ESMS and persona core for Solana'
  }
  instructions: [
    {
      name: 'claimMintEsms'
      discriminator: [194, 59, 120, 134, 151, 157, 193, 239]
      accounts: [
        {
          name: 'programConfig'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ]
              },
            ]
          }
        },
        {
          name: 'claimReceipt'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [99, 108, 97, 105, 109, 95, 114, 101, 99, 101, 105, 112, 116]
              },
              {
                kind: 'arg'
                path: 'claimId'
              },
            ]
          }
        },
        {
          name: 'authority'
          writable: true
          signer: true
        },
        {
          name: 'recipient'
        },
        {
          name: 'spiritMint'
          writable: true
        },
        {
          name: 'essenceMint'
          writable: true
        },
        {
          name: 'matterMint'
          writable: true
        },
        {
          name: 'substanceMint'
          writable: true
        },
        {
          name: 'spiritAccount'
          writable: true
        },
        {
          name: 'essenceAccount'
          writable: true
        },
        {
          name: 'matterAccount'
          writable: true
        },
        {
          name: 'substanceAccount'
          writable: true
        },
        {
          name: 'tokenProgram'
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
        },
        {
          name: 'associatedTokenProgram'
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'claimId'
          type: {
            array: ['u8', 32]
          }
        },
        {
          name: 'ledgerReferenceHash'
          type: {
            array: ['u8', 32]
          }
        },
        {
          name: 'amounts'
          type: {
            array: ['u64', 4]
          }
        },
      ]
    },
    {
      name: 'initializeConfig'
      discriminator: [208, 127, 21, 1, 194, 190, 196, 70]
      accounts: [
        {
          name: 'programConfig'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ]
              },
            ]
          }
        },
        {
          name: 'admin'
          writable: true
          signer: true
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'attestor'
          type: 'pubkey'
        },
        {
          name: 'pauser'
          type: 'pubkey'
        },
        {
          name: 'clusterDomain'
          type: {
            array: ['u8', 32]
          }
        },
      ]
    },
    {
      name: 'initializeEsmsMints'
      discriminator: [195, 95, 238, 168, 120, 136, 203, 4]
      accounts: [
        {
          name: 'programConfig'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ]
              },
            ]
          }
        },
        {
          name: 'admin'
          writable: true
          signer: true
        },
        {
          name: 'spiritMint'
          writable: true
        },
        {
          name: 'essenceMint'
          writable: true
        },
        {
          name: 'matterMint'
          writable: true
        },
        {
          name: 'substanceMint'
          writable: true
        },
        {
          name: 'tokenProgram'
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: []
    },
    {
      name: 'recordPersonaCommitment'
      discriminator: [228, 40, 100, 106, 125, 164, 118, 37]
      accounts: [
        {
          name: 'programConfig'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ]
              },
            ]
          }
        },
        {
          name: 'personaCommitment'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [
                  112,
                  101,
                  114,
                  115,
                  111,
                  110,
                  97,
                  95,
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116,
                ]
              },
              {
                kind: 'arg'
                path: 'agentId'
              },
            ]
          }
        },
        {
          name: 'writer'
          writable: true
          signer: true
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'agentId'
          type: {
            array: ['u8', 32]
          }
        },
        {
          name: 'targetPersonaHash'
          type: {
            array: ['u8', 32]
          }
        },
        {
          name: 'epochHash'
          type: {
            array: ['u8', 32]
          }
        },
        {
          name: 'sequence'
          type: 'u64'
        },
      ]
    },
    {
      name: 'redeemEsms'
      discriminator: [182, 20, 159, 192, 104, 83, 177, 113]
      accounts: [
        {
          name: 'programConfig'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ]
              },
            ]
          }
        },
        {
          name: 'orderReceipt'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [111, 114, 100, 101, 114, 95, 114, 101, 99, 101, 105, 112, 116]
              },
              {
                kind: 'arg'
                path: 'orderId'
              },
            ]
          }
        },
        {
          name: 'holder'
          writable: true
          signer: true
        },
        {
          name: 'spiritMint'
          writable: true
        },
        {
          name: 'essenceMint'
          writable: true
        },
        {
          name: 'matterMint'
          writable: true
        },
        {
          name: 'substanceMint'
          writable: true
        },
        {
          name: 'spiritAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'holder'
              },
              {
                kind: 'account'
                path: 'tokenProgram'
              },
              {
                kind: 'account'
                path: 'spiritMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'essenceAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'holder'
              },
              {
                kind: 'account'
                path: 'tokenProgram'
              },
              {
                kind: 'account'
                path: 'essenceMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'matterAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'holder'
              },
              {
                kind: 'account'
                path: 'tokenProgram'
              },
              {
                kind: 'account'
                path: 'matterMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'substanceAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'holder'
              },
              {
                kind: 'account'
                path: 'tokenProgram'
              },
              {
                kind: 'account'
                path: 'substanceMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'tokenProgram'
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'orderId'
          type: {
            array: ['u8', 32]
          }
        },
        {
          name: 'amounts'
          type: {
            array: ['u64', 4]
          }
        },
      ]
    },
    {
      name: 'redeemForEsms'
      discriminator: [86, 175, 194, 240, 164, 243, 199, 163]
      accounts: [
        {
          name: 'programConfig'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ]
              },
            ]
          }
        },
        {
          name: 'orderReceipt'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [111, 114, 100, 101, 114, 95, 114, 101, 99, 101, 105, 112, 116]
              },
              {
                kind: 'arg'
                path: 'orderId'
              },
            ]
          }
        },
        {
          name: 'sponsor'
          writable: true
          signer: true
        },
        {
          name: 'holder'
        },
        {
          name: 'spiritMint'
          writable: true
        },
        {
          name: 'essenceMint'
          writable: true
        },
        {
          name: 'matterMint'
          writable: true
        },
        {
          name: 'substanceMint'
          writable: true
        },
        {
          name: 'spiritAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'holder'
              },
              {
                kind: 'account'
                path: 'tokenProgram'
              },
              {
                kind: 'account'
                path: 'spiritMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'essenceAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'holder'
              },
              {
                kind: 'account'
                path: 'tokenProgram'
              },
              {
                kind: 'account'
                path: 'essenceMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'matterAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'holder'
              },
              {
                kind: 'account'
                path: 'tokenProgram'
              },
              {
                kind: 'account'
                path: 'matterMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'substanceAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'holder'
              },
              {
                kind: 'account'
                path: 'tokenProgram'
              },
              {
                kind: 'account'
                path: 'substanceMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'instructions'
        },
        {
          name: 'tokenProgram'
          address: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'orderId'
          type: {
            array: ['u8', 32]
          }
        },
        {
          name: 'amounts'
          type: {
            array: ['u64', 4]
          }
        },
        {
          name: 'deadline'
          type: 'i64'
        },
      ]
    },
    {
      name: 'setPauseState'
      discriminator: [130, 225, 63, 203, 229, 214, 138, 17]
      accounts: [
        {
          name: 'programConfig'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ]
              },
            ]
          }
        },
        {
          name: 'authority'
          signer: true
        },
      ]
      args: [
        {
          name: 'pauseClaims'
          type: 'bool'
        },
        {
          name: 'pauseRedemptions'
          type: 'bool'
        },
      ]
    },
  ]
  accounts: [
    {
      name: 'claimReceipt'
      discriminator: [223, 233, 11, 229, 124, 165, 207, 28]
    },
    {
      name: 'orderReceipt'
      discriminator: [133, 4, 37, 85, 200, 201, 93, 70]
    },
    {
      name: 'personaCommitment'
      discriminator: [230, 97, 191, 242, 27, 177, 16, 63]
    },
    {
      name: 'programConfig'
      discriminator: [196, 210, 90, 231, 144, 149, 140, 63]
    },
  ]
  errors: [
    {
      code: 6000
      name: 'unauthorized'
      msg: 'Unauthorized authority'
    },
    {
      code: 6001
      name: 'claimsPaused'
      msg: 'Claims are paused'
    },
    {
      code: 6002
      name: 'redemptionsPaused'
      msg: 'Redemptions are paused'
    },
    {
      code: 6003
      name: 'defaultAuthority'
      msg: 'A required public key cannot be the default key'
    },
    {
      code: 6004
      name: 'invalidClusterDomain'
      msg: 'The cluster domain must be non-zero'
    },
    {
      code: 6005
      name: 'zeroCommitment'
      msg: 'Persona commitments and agent IDs must be non-zero'
    },
    {
      code: 6006
      name: 'invalidSequence'
      msg: 'Persona sequence must begin at one and increment exactly once'
    },
    {
      code: 6007
      name: 'arithmeticOverflow'
      msg: 'Arithmetic overflow'
    },
    {
      code: 6008
      name: 'emptyAmounts'
      msg: 'At least one ESMS amount must be non-zero'
    },
    {
      code: 6009
      name: 'amountOutOfRange'
      msg: 'An ESMS amount exceeds the Decimal(12,4) ledger domain'
    },
    {
      code: 6010
      name: 'invalidTokenProgram'
      msg: 'The Token-2022 program is invalid'
    },
    {
      code: 6011
      name: 'invalidMint'
      msg: 'The ESMS mint account is invalid'
    },
    {
      code: 6012
      name: 'invalidMintExtensions'
      msg: 'The ESMS mint extensions or authorities do not match protocol configuration'
    },
    {
      code: 6013
      name: 'authorizationExpired'
      msg: 'The holder authorization has expired'
    },
    {
      code: 6014
      name: 'invalidEd25519Authorization'
      msg: 'The Ed25519 holder authorization is missing or invalid'
    },
    {
      code: 6015
      name: 'zeroReceiptIdentifier'
      msg: 'The receipt identifier or ledger reference must be non-zero'
    },
    {
      code: 6016
      name: 'invalidTokenAccount'
      msg: 'The source token account does not belong to the expected holder and mint'
    },
    {
      code: 6017
      name: 'invalidInstructionsSysvar'
      msg: 'The instruction sysvar account is invalid'
    },
  ]
  types: [
    {
      name: 'claimReceipt'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'version'
            type: 'u8'
          },
          {
            name: 'claimId'
            type: {
              array: ['u8', 32]
            }
          },
          {
            name: 'ledgerReferenceHash'
            type: {
              array: ['u8', 32]
            }
          },
          {
            name: 'recipient'
            type: 'pubkey'
          },
          {
            name: 'amounts'
            type: {
              array: ['u64', 4]
            }
          },
          {
            name: 'authority'
            type: 'pubkey'
          },
          {
            name: 'settledSlot'
            type: 'u64'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'orderReceipt'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'version'
            type: 'u8'
          },
          {
            name: 'orderId'
            type: {
              array: ['u8', 32]
            }
          },
          {
            name: 'holder'
            type: 'pubkey'
          },
          {
            name: 'amounts'
            type: {
              array: ['u64', 4]
            }
          },
          {
            name: 'submitter'
            type: 'pubkey'
          },
          {
            name: 'mode'
            type: 'u8'
          },
          {
            name: 'settledSlot'
            type: 'u64'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'personaCommitment'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'version'
            type: 'u8'
          },
          {
            name: 'agentId'
            type: {
              array: ['u8', 32]
            }
          },
          {
            name: 'targetPersonaHash'
            type: {
              array: ['u8', 32]
            }
          },
          {
            name: 'epochHash'
            type: {
              array: ['u8', 32]
            }
          },
          {
            name: 'sequence'
            type: 'u64'
          },
          {
            name: 'writer'
            type: 'pubkey'
          },
          {
            name: 'updatedSlot'
            type: 'u64'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'programConfig'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'version'
            type: 'u8'
          },
          {
            name: 'admin'
            type: 'pubkey'
          },
          {
            name: 'attestor'
            type: 'pubkey'
          },
          {
            name: 'pauser'
            type: 'pubkey'
          },
          {
            name: 'clusterDomain'
            type: {
              array: ['u8', 32]
            }
          },
          {
            name: 'pauseClaims'
            type: 'bool'
          },
          {
            name: 'pauseRedemptions'
            type: 'bool'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
  ]
}

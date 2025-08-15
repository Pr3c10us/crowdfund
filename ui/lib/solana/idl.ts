export const IDL = {
  "address": "6jzv4ApJTAWKWu8puDgMpzwV2pMGLp1nvDUoYrpMUjVM",
  "metadata": {
    "name": "crowdfunding",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "create_campaign",
      "discriminator": [
        111,
        131,
        187,
        98,
        160,
        193,
        114,
        244
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "system_config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  121,
                  115,
                  116,
                  101,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "duration_seconds",
          "type": "i64"
        },
        {
          "name": "milestone_amounts",
          "type": {
            "vec": "u64"
          }
        },
        {
          "name": "milestone_description",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "image_url",
          "type": "string"
        }
      ]
    },
    {
      "name": "donate",
      "discriminator": [
        121,
        186,
        218,
        211,
        73,
        70,
        196,
        180
      ],
      "accounts": [
        {
          "name": "donor",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "donor"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initiate_contract",
      "discriminator": [
        105,
        93,
        165,
        146,
        252,
        75,
        66,
        236
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  121,
                  115,
                  116,
                  101,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "dispute_seconds",
          "type": "i64"
        }
      ]
    },
    {
      "name": "lock_campaign",
      "discriminator": [
        196,
        201,
        97,
        225,
        58,
        254,
        211,
        32
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "system_config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  121,
                  115,
                  116,
                  101,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "status",
          "type": "bool"
        }
      ]
    },
    {
      "name": "refund",
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "donor",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "account",
                "path": "donor"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "release",
      "discriminator": [
        253,
        249,
        15,
        206,
        28,
        127,
        193,
        241
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              }
            ]
          }
        },
        {
          "name": "system_config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  121,
                  115,
                  116,
                  101,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "update_authorithy",
      "discriminator": [
        243,
        253,
        23,
        72,
        180,
        83,
        19,
        210
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  121,
                  115,
                  116,
                  101,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "authority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "update_dispute_seconds",
      "discriminator": [
        134,
        218,
        93,
        98,
        192,
        238,
        33,
        101
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  121,
                  115,
                  116,
                  101,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "dispute_seconds",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Campaign",
      "discriminator": [
        50,
        40,
        49,
        11,
        157,
        220,
        229,
        192
      ]
    },
    {
      "name": "DonationReceipt",
      "discriminator": [
        212,
        246,
        233,
        144,
        156,
        112,
        113,
        14
      ]
    },
    {
      "name": "SystemConfig",
      "discriminator": [
        218,
        150,
        16,
        126,
        102,
        185,
        75,
        1
      ]
    }
  ],
  "events": [
    {
      "name": "CampaignCreated",
      "discriminator": [
        9,
        98,
        69,
        61,
        53,
        131,
        64,
        152
      ]
    },
    {
      "name": "DonationReceived",
      "discriminator": [
        160,
        135,
        32,
        7,
        241,
        105,
        91,
        158
      ]
    },
    {
      "name": "MilestoneReleased",
      "discriminator": [
        49,
        225,
        91,
        223,
        34,
        165,
        109,
        181
      ]
    },
    {
      "name": "RefundIssued",
      "discriminator": [
        249,
        16,
        159,
        159,
        93,
        186,
        145,
        206
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ConfigLocked",
      "msg": "Campaign already active – config locked"
    },
    {
      "code": 6001,
      "name": "NotFailed",
      "msg": "Campaign not yet ended or already successful"
    },
    {
      "code": 6002,
      "name": "InDispute",
      "msg": "Campaign still in dispute period"
    },
    {
      "code": 6003,
      "name": "BadMilestone",
      "msg": "Milestone already released or index out of bounds"
    },
    {
      "code": 6004,
      "name": "TargetNotReached",
      "msg": "Target not reached"
    },
    {
      "code": 6005,
      "name": "NothingToRefund",
      "msg": "Nothing to refund"
    },
    {
      "code": 6006,
      "name": "InvalidMilestone",
      "msg": "Invalid milestone index or already released"
    },
    {
      "code": 6007,
      "name": "DisputeWindowOpen",
      "msg": "Dispute window is still open"
    },
    {
      "code": 6008,
      "name": "AlreadyReleased",
      "msg": "Milestone already released"
    },
    {
      "code": 6009,
      "name": "UnAuthorized",
      "msg": "Unauthorized to release funds"
    },
    {
      "code": 6010,
      "name": "CampaignLocked",
      "msg": "The funds in the campaign has been locked"
    },
    {
      "code": 6011,
      "name": "ConfigNotInitialized",
      "msg": "System config not initialized"
    },
    {
      "code": 6012,
      "name": "ConfigInitialized",
      "msg": "System config already initialized"
    }
  ],
  "types": [
    {
      "name": "Campaign",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "target_lamports",
            "type": "u64"
          },
          {
            "name": "start_ts",
            "type": "i64"
          },
          {
            "name": "end_ts",
            "type": "i64"
          },
          {
            "name": "total_donated",
            "type": "u64"
          },
          {
            "name": "milestones",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "Milestone"
                  }
                },
                5
              ]
            }
          },
          {
            "name": "milestone_count",
            "type": "u8"
          },
          {
            "name": "last_release_ts",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "image_url",
            "type": "string"
          },
          {
            "name": "locked",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "CampaignCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "DonationReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "donor",
            "type": "pubkey"
          },
          {
            "name": "lamports",
            "type": "u64"
          },
          {
            "name": "refunded",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "DonationReceived",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "donor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "Milestone",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "release_ts",
            "type": "i64"
          },
          {
            "name": "released",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "MilestoneReleased",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "RefundIssued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "donor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "SystemConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authorithy",
            "type": "pubkey"
          },
          {
            "name": "dispute_seconds",
            "type": "i64"
          }
        ]
      }
    }
  ]
}
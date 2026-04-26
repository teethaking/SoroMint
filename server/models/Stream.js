const mongoose = require('mongoose');

/**
 * @title Stream Schema
 * @description MongoDB schema for payment streams on the SoroMint platform
 * @notice Stores metadata for token streams between users
 */

const StreamSchema = new mongoose.Schema({
  /**
   * @property {string} senderAddress - Stellar public key of the sender
   */
  senderAddress: {
    type: String,
    required: true,
    index: true, // Issue #510: Index senderAddress
  },
  /**
   * @property {string} recipientAddress - Stellar public key of the recipient
   */
  recipientAddress: {
    type: String,
    required: true,
    index: true, // Issue #510: Index recipientAddress
  },
  /**
   * @property {string} tokenContractId - The contract ID of the token being streamed
   */
  tokenContractId: {
    type: String,
    required: true,
  },
  /**
   * @property {string} amount - Total amount to be streamed (as string to handle i128)
   */
  amount: {
    type: String,
    required: true,
  },
  /**
   * @property {string} status - Current status of the stream (active, completed, cancelled)
   */
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  /**
   * @property {Date} createdAt - Timestamp of stream creation
   */
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Issue #510: Compound index for status and createdAt
StreamSchema.index({ status: 1, createdAt: -1 });

/**
 * @type {mongoose.Model}
 */
module.exports = mongoose.model('Stream', StreamSchema);

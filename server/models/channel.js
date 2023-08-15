import mongoose from "mongoose";

const ChannelSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  members: {
    type: Array, // Array of user IDs or references
    required: false,
  },
  administrators: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  messages: [
    {
      id: {
        type: String,
        required: true
      },
      sender: {
        id: {
          type: mongoose.Schema.Types.ObjectId, // Reference to User collection
          ref: "User",
          required: true
        },

        name: {
          type: String,
          required: true
        },
        email: {
          type: String,
          required: true
        }
      },
      content: {
        type: String,
        required: false,
      },

      file: {
        path: {
        type: String,
        required: false
    },
      id: {
        type: String,
        required: false
      },
    name: {
        type: String,
        required: false
    },
    downloadCount: {
        type: Number,
        required: false,
        default: 0
    },
    mimetype: {
      type: String,
      required: false,
    }
      },
      
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

export const Channel = mongoose.model("Channel", ChannelSchema);

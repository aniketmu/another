import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },

  profileImage: {
    type: String,
    require: false
  },
  password: {
    type: String,
    required: true,
  },
  directs:  {
    type: Array,
    required: false,
}
});

export const User = mongoose.model("User", UserSchema);
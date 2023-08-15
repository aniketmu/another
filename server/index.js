import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { v4 as uuid } from 'uuid';
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http"; // Import the http module
import { Server } from "socket.io"; // Corrected import
import db from "./mongoDB/connect.js";
import { User } from "./models/user.js";
import { Channel } from "./models/channel.js";
import upload from "./utils/upload.js";
import { send } from "process";
import cookieParser from "cookie-parser";

dotenv.config();

const ObjectId = mongoose.Types.ObjectId;

const app = express();
app.use(cookieParser());
const server = http.createServer(app); // Create an HTTP server using the http module
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ['GET', 'POST']
    }
});

app.use(express.json()); // Add this line
app.use(cors());


app.get("/", (req, res) => {
  res.send("Hello from server!");
});

app.get('/file/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;

    console.log(fileId);

    // Search in Channels collection
    Channel.findOne({ "messages.file.id": fileId })
      .then((channel) => {
        if (channel) {
          const foundMessage = channel.messages.find(message => message.file.id === fileId);
          if (foundMessage) {
            console.log(foundMessage.file);
            // Process the channel file here
            foundMessage.file.downloadCount++;
            channel.save();
            res.download(foundMessage.file.path, foundMessage.file.name);
          } else {
            console.log("File not found in channel messages");
            res.status(404).send('File not found');
          }
        } else {
          console.log("File not found in Channels collection");
          res.status(404).send('File not found');
        }
      })
      .catch((error) => {
        console.error("Error fetching channel:", error);
        res.status(500).send('Internal Server Error');
      });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



io.on("connection", (socket) => {
    console.log("A user connected");
  
    socket.on("join", (channelId) => {
      socket.join(channelId);
    });

  
    socket.on("chatMessage", async ({ channelId, message }) => {
      console.log("receieved", channelId, message)
        try {
            // Find the channel by its ID
            const objectIdChannelId = new ObjectId(channelId);
    
            const channel = await Channel.findOne({ _id: objectIdChannelId });
    
            if (!channel) {
                console.log("Channel not found");
                return;
            }
    
            // Create a new message object with required fields
            const newMessage = {
                content: message.content, // Make sure to provide the content
                sender: message.sender,   // Make sure to provide the sender
                id: message.id || new ObjectId(), // Provide the id or generate a new one
                file: message.file
            };
    
            // Push the new message to the messages array
            channel.messages.push(newMessage);
    
            // Save the updated channel with the new message
            await channel.save();
    
            // Emit the message to the channel room
            io.to(channelId).emit("message", { message: newMessage });
        } catch (error) {
            console.error("Error saving message:", error);
        }
    });
  
    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });

app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    // Check if the email is already in use
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).send({ message: "Email is already in use. Please choose another email." });
    }

    // Hash the password and create the new user
    bcrypt.hash(password, 10).then(async (hashedPassword) => {
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        try {
            const savedUser = await user.save();
            res.status(200).send({ message: "User created successfully", user: savedUser });
        } catch (error) {
            res.status(500).send({ message: "User could not be created", error });
        }
    }).catch(() => {
        res.status(500).send({ message: 'Password was not hashed successfully' });
    });
});

app.post("/signin", async (req, res) => {
  User.findOne({ email: req.body.email })
      .then((user) => {
          if (!user) {
              return res.status(404).send({ message: "User not found" });
          }


          bcrypt.compare(req.body.password, user.password)
              .then((passwordCheck) => {
                  if (!passwordCheck) {
                      return res.status(401).send({ message: "Password does not match" });
                  }

                  const token = jwt.sign(
                      {
                          userId: user._id,
                          userEmail: user.email,
                      },
                      process.env.SECRET_KEY,
                      {
                          expiresIn: "24h",
                      }
                  );

                  res.status(200).send({ message: "Login Successful", userId: user._id, email: user.email, name: user.name, token });
              })
              .catch(() => {
                  res.status(401).send({ message: "Password does not match" })
              });
      })
      .catch((error) => {
          res.status(500).send({ message: "An error occurred", error });
      });
});

app.post("/channel",  async (req, res)=> {
    const userId = req.body.userId;
    const objectUserId = new ObjectId(userId)
    try {
        const channel = await Channel.find({'members.objectUserId': objectUserId})
        if(!channel.length){
            return res.status(404).send({message: "Not found"})
        }
        res.status(200).send({message: "Found", channel})

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "An error occurred", error });
    }
})

app.post("/messages", async (req, res) => {
    const channelId = req.body.channelId;
  
    try {
      // Convert the channelId string to ObjectId
      const objectIdChannelId = new ObjectId(channelId);
  
      const channel = await Channel.findOne({ _id: objectIdChannelId });
  
      if (!channel) {
        return res.status(401).send({ message: "Channel not found" });
      }
  
      const messages = channel.messages;
  
      if (!messages || messages.length === 0) {
        return res.status(401).send({ message: "No Messages Found" });
      }

      // const modifiedMessages = messages.map((message) => ({
      //   ...message.toObject(),
      //   file: {
      //     ...message.file.toObject(),
      //     path: `https://backend-prelim.onrender.com/file/${message.file.id}`
      //   }
      // }));
  
      res.status(200).send({ message: "Messages Found", messages: messages });
    } catch (error) {
      console.log("Error fetching messages:", error);
      res.status(500).send({ message: "An error occurred", error });
    }
  });

  app.post("/add-channel", async (req, res) => {
    const { name, userId } = req.body;

    const objectUserId = new ObjectId(userId)
  
    try {
      const channel = new Channel({
        name,
        members: [{ objectUserId }],
        administrators: [{ objectUserId }], // Add the user as an administrator
        messages: [],
      });
  
      await channel.save();
      res.status(200).send({ message: `Channel with name: ${name} created successfully` });
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "Channel could not be created", error });
    }
  });

  app.post("/invite-to-channel", async (req, res) => {
    const { channelId, email } = req.body;
  
    try {
      // Find the channel by its ID
      const channel = await Channel.findById(channelId);
  
      if (!channel) {
        return res.status(404).send({ message: "Channel not found" });
      }
  
      // Find the user by email
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
  
      // Check if the user is already a member or administrator of the channel
      if (
        channel.members.some((member) => member.objectUserId.toString() === user._id.toString()) ||
        channel.administrators.some((admin) => admin._id.toString() === user._id.toString())
      ) {
        return res.status(400).send({ message: "User is already a member or administrator of the channel" });
      }
  
      // Add the user as a member and send success response
      channel.members.push({ objectUserId: user._id });
      await channel.save();
  
      res.status(200).send({ message: `User ${user.name} invited to join the channel` });
    } catch (error) {
      console.error("Error inviting user:", error);
      res.status(500).send({ message: "An error occurred", error });
    }
  });
  

  app.post("/search-Users", async (req, res) => {// Add this log
    const { userEmail } = req.body;
    console.log("Search users request received", userEmail)
    try {
      const users = await User.aggregate([
        {
          $match: {
            $or: [{ email: { $regex: userEmail, $options: "i" } }],
          },
        },
      ]).exec();
  
      if (!users || users.length === 0) {
        res.status(404).send({ message: "No users found" });
      } else {
        res.status(200).send({ message: "Users found", users });
      }
      console.log("Response sent"); // Add this log
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "An error occurred", error });
    }
  });

  app.post("/chat-message-file", upload.single('file'), async (request, response) =>{

    console.log("file", )
    const fileObj = {
      id: uuid(),
      path: request.file.path,
      name: request.file.originalname,
      mimetype: request.file.mimetype
    }

    console.log("file", fileObj)
    response.status(200).send({message: 'Direct message and file details stored.', fileObj})
  })
  
  app.post('/update-profile-image', async (req, res) => {
    const { userId, photoUrl } = req.body;
  
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { profileImage: photoUrl },
        { new: true } // Return the updated user
      );
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'An error occurred' });
    }
  });
  

server.listen(8000, ()=> {
    console.log("Its alive at 8000");
})

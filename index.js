import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
// verify jwt
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unAuthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_ACCESS}@cluster0.bfqzn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // Connections
    const database = client.db("blogeng_bd");
    const blogsCollection = database.collection("blogs");
    const commentsCollection = database.collection("comments");
    const wishlistCollection = database.collection("wishlist");

    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Reading
    // all blogs
    app.get("/blogs", async (req, res) => {
      const cursor = blogsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // words length based
    app.get("/words", async (req, res) => {
      const result = await blogsCollection
        .aggregate([
          {
            $addFields: {
              descriptionLength: { $strLenCP: "$description" }, // Compute string length
            },
          },
          {
            $sort: { descriptionLength: -1 }, // Sort by the computed length
          },
        ])
        .toArray();
      res.send(result);
    });
    // featured blogs
    app.get("/featured", async (req, res) => {
      const result = await blogsCollection
        .aggregate([
          {
            $addFields: {
              descriptionLength: { $strLenCP: "$description" },
            },
          },
          {
            $sort: { descriptionLength: -1 },
          },
          {
            $limit: 10, // Limit the results to the top 10 blogs
          },
        ])
        .toArray();

      res.send(result);
    });
    // specific blog
    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });
    // blog for update
    app.get("/update/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });
    // search blog
    app.get("/blogs/search", async (req, res) => {
      const query = req.query.query;
      const cursor = blogsCollection.find({
        $text: { $search: query },
      });
      const result = await cursor.toArray();
      res.status(200).send(result);
    });
    // comments
    app.get("/comments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { blogId: id };
      const result = await commentsCollection.find(query).toArray();
      res.send(result);
    });
    // wishlist blogs
    app.get("/wishlist", async (req, res) => {
      const cursor = wishlistCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // specific wishlist
    app.get("/wishlist/user", async (req, res) => {
      const query = req.query.query;
      const cursor = wishlistCollection.find({ wishlistFor: query });
      const result = await cursor.toArray();
      res.send(result);
    });
    // latest blogs
    app.get("/latest", async (req, res) => {
      const cursor = blogsCollection.find().sort({ publishDate: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Posting
    // blogs
    app.post("/blogs", async (req, res) => {
      const newBlog = req.body;
      const result = await blogsCollection.insertOne(newBlog);
      res.send(result);
    });
    // comments
    app.post("/comments", async (req, res) => {
      const newComment = req.body;
      const result = await commentsCollection.insertOne(newComment);
      res.send(result);
    });
    // wishlist
    app.post("/wishlist", async (req, res) => {
      const newWishlist = req.body;
      const result = await wishlistCollection.insertOne(newWishlist);
      res.send(result);
    });

    // Updating
    // blogs
    app.put("/update/blog/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedBlog = {
        $set: req.body,
      };
      const result = await blogsCollection.updateOne(
        filter,
        updatedBlog,
        options
      );
      res.send(result);
    });

    // Deleting
    // blogs
    app.delete("/delete/blog", async (req, res) => {
      const reqQuery = req.query.query;
      const query = { _id: new ObjectId(reqQuery) };
      const result = await blogsCollection.deleteOne(query);
      res.send(result);
    });
    // wishlist
    app.delete("/wishlist/blog", async (req, res) => {
      const reqQuery = req.query.query;
      const query = { _id: new ObjectId(reqQuery) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("My HOT Server for BlogEng BD");
});
app.listen(port, () => {
  console.log(`Server in port: ${port}`);
});

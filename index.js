import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
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

const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.wxytm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const dataBase = client.db("mess_management");
    const userColl = dataBase.collection("users");
    const memberColl = dataBase.collection("member");
    const mealColl = dataBase.collection("meal");
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // member add

    app.post("/memberAdd", async (req, res) => {
      const member = req.body;
      console.log(member);
      const result = await memberColl.insertOne(member);
      res.send(result);
    });

    // member show / get

    app.get("/allMember", async (req, res) => {
      const allMember = memberColl.find();
      const result = await allMember.toArray();
      res.send(result);
    });

    // add Meal

    app.post("/addMeal", async (req, res) => {
      const addMeal = req.body;
      console.log(addMeal);
      const result = await mealColl.insertMany(addMeal);
      res.send(result);
    });

    // meal show

    app.get("/meals", async (req, res) => {
      const { date } = req.query;

      // if (!date) {
      //   return res.status(400).json({ message: "Meal date is required" });
      // }

      try {
        const groupedMeals = await mealColl
          .aggregate([
            {
              $group: {
                _id: "$mealDate", // Group meals by mealDate
                totalMeals: { $sum: 1 }, // Count number of meals per date
                meals: { $push: "$$ROOT" }, // Store all meals for that date
              },
            },
            {
              $sort: { _id: 1 }, // Sort by date (optional)
            },
          ])
          .toArray();

        res.send(groupedMeals);
      } catch (error) {
        res.status(500).send({ message: "Error fetching meals", error });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running port: ${port}`);
});

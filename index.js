const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
      // Ensure each meal entry has a unique ObjectId
      const meals = addMeal.map((meal) => ({
        ...meal,

        mealDate: new Date().toISOString().split("T")[0], // Ensure correct meal date
      }));
      for (const meal of meals) {
        // Check if the meal already exists for this member on the same date
        const existingMeal = await mealColl.findOne({
          member_id: meal.member_id,
          mealDate: meal.mealDate,
          name: meal.name, // Optional: check for duplicate meal name
        });

        if (existingMeal) {
          // If the meal already exists, increment the meal count
          await mealColl.updateOne(
            { _id: existingMeal._id },
            { $inc: { count: 1 } } // Increment the meal count
          );
        } else {
          // If no existing meal found, insert a new meal with count = 1
          meal.count = 1; // Initialize count to 1 for a new meal
          await mealColl.insertOne(meal);
        }
      }
      res.send({ message: "Meals added successfully" });
    });

    // meal show

    app.get("/meals", async (req, res) => {
      // const { date } = req.query;

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

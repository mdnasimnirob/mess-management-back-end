const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// app.use(
//   cors({
//     origin: "https://mess-management-17ffa.web.app", // Your frontend URL
//     methods: ["GET", "POST"],
//     credentials: true, // Include cookies if needed
//   })
// );

app.use(cors({ origin: "https://mess-management-17ffa.web.app" }));
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

    // app.use((req, res, next) => {
    //   res.header("Access-Control-Allow-Origin", "*"); // Replace '*' with your frontend URL for security
    //   res.header(
    //     "Access-Control-Allow-Methods",
    //     "GET, POST, PUT, DELETE, OPTIONS"
    //   );
    //   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    //   next();
    // });

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

    // member edit

    app.put("/memberUpdate/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedMember = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            name: updatedMember.name,
            address: updatedMember.address,
          },
        };

        const result = await memberColl.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Member not found" });
        }

        if (result.modifiedCount === 0) {
          return res.json({ success: false, message: "No changes made" });
        }

        res.json({ success: true, message: "Member updated successfully" });
      } catch (error) {
        console.error("Error updating member:", error);
        res.status(500).json({ success: false, message: "Server error" });
      }
    });

    // delete member

    app.delete("/memberDelete/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const deleteResult = await memberColl.deleteOne(query);
      res.send(deleteResult);
    });

    // add Meal

    app.post("/addMeal", async (req, res) => {
      const meals = req.body; // Array of meal objects
      const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

      try {
        // Check if any member already has a meal for today
        const alreadyExists = await mealColl
          .find({
            member_id: { $in: meals.map((m) => m.member_id) }, // Check for all members
            mealDate: today, // Ensure it's today's date
          })
          .toArray();

        // Filter out members who already have a meal for today
        const newMeals = meals.filter(
          (m) =>
            !alreadyExists.some(
              (existingMeal) => existingMeal.member_id === m.member_id
            )
        );

        if (newMeals.length === 0) {
          return res
            .status(400)
            .json({ message: "Meal already added for today!" });
        }

        // Prepare the new meals to be inserted
        const mealsToInsert = newMeals.map((meal) => {
          return {
            ...meal,
            mealDate: today, // Add today's date
            memberName: meal.memberName, // Add member name if not already present
            memberAddress: meal.memberAddress, // Add member address if not already present
            guestMeals: meal.guestMeals || 0, // Ensure guest meals count is present
          };
        });

        // Insert new meals into the database
        await mealColl.insertMany(mealsToInsert);

        res.status(201).json({
          message: "Meals added successfully!",
          addedMeals: mealsToInsert,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.get("/meals", async (req, res) => {
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

    // today Meals

    app.get("/meals/today", async (req, res) => {
      try {
        const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
        const meals = await mealColl.find({ mealDate: today }).toArray();

        res.status(200).json({ message: "Today's meals", meals });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // weekly Meals

    app.get("/meals/weekly", async (req, res) => {
      try {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7); // Get date 7 days ago

        const meals = await mealColl
          .find({
            mealDate: {
              $gte: lastWeek.toISOString().split("T")[0], // Start of the week
              $lte: today.toISOString().split("T")[0], // Today
            },
          })
          .toArray();

        res.status(200).json({ message: "Weekly meals", meals });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // monthly Meals

    app.get("/meals/monthly", async (req, res) => {
      try {
        const today = new Date();
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        const lastDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );

        const meals = await mealColl
          .find({
            mealDate: {
              $gte: firstDayOfMonth.toISOString().split("T")[0], // Start of month
              $lte: lastDayOfMonth.toISOString().split("T")[0], // End of month
            },
          })
          .toArray();

        res.status(200).json({ message: "Monthly meals", meals });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // today Guest Meals

    app.get("/guest-meals/today", async (req, res) => {
      try {
        const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

        const guestMeals = await mealColl
          .aggregate([
            { $match: { mealDate: today } }, // Filter for today's date
            { $group: { _id: null, totalGuestMeals: { $sum: "$guestMeals" } } }, // Sum guest meals
          ])
          .toArray();

        res.status(200).json({
          message: "Today's Guest Meals",
          totalGuestMeals: guestMeals[0]?.totalGuestMeals || 0,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // weekly Guest Meals

    app.get("/guest-meals/weekly", async (req, res) => {
      try {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7); // Get date 7 days ago

        const guestMeals = await mealColl
          .aggregate([
            {
              $match: {
                mealDate: {
                  $gte: lastWeek.toISOString().split("T")[0],
                  $lte: today.toISOString().split("T")[0],
                },
              },
            }, // Filter for last 7 days
            { $group: { _id: null, totalGuestMeals: { $sum: "$guestMeals" } } }, // Sum guest meals
          ])
          .toArray();

        res.status(200).json({
          message: "Weekly Guest Meals",
          totalGuestMeals: guestMeals[0]?.totalGuestMeals || 0,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // monthly Guest Meals

    app.get("/guest-meals/monthly", async (req, res) => {
      try {
        const today = new Date();
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        const lastDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );

        const guestMeals = await mealColl
          .aggregate([
            {
              $match: {
                mealDate: {
                  $gte: firstDayOfMonth.toISOString().split("T")[0],
                  $lte: lastDayOfMonth.toISOString().split("T")[0],
                },
              },
            }, // Filter for current month
            { $group: { _id: null, totalGuestMeals: { $sum: "$guestMeals" } } }, // Sum guest meals
          ])
          .toArray();

        res.status(200).json({
          message: "Monthly Guest Meals",
          totalGuestMeals: guestMeals[0]?.totalGuestMeals || 0,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
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

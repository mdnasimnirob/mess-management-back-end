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

        res
          .status(201)
          .json({
            message: "Meals added successfully!",
            addedMeals: mealsToInsert,
          });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // app.post("/addMeal", async (req, res) => {
    //   const meals = req.body; // Array of meal objects
    //   const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    //   try {
    //     const alreadyExists = await mealColl
    //       .find({
    //         member_id: { $in: meals.map((m) => m.member_id) }, // Check for all members
    //         mealDate: today, // Ensure it's today's date
    //       })
    //       .toArray();

    //     // Filter out members who already have a meal today
    //     const newMeals = meals.filter(
    //       (m) =>
    //         !alreadyExists.some(
    //           (existingMeal) => existingMeal.member_id === m.member_id
    //         )
    //     );

    //     if (newMeals.length === 0) {
    //       return res
    //         .status(400)
    //         .json({ message: "Meal already added for today!" });
    //     }

    //     // Insert only new meals
    //     await mealColl.insertMany(newMeals);
    //     res
    //       .status(201)
    //       .json({ message: "Meals added successfully!", addedMeals: newMeals });
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ message: "Internal Server Error" });
    //   }
    // });

    // app.post("/addMeal", async (req, res) => {
    //   const addMeal = req.body;
    //   console.log(addMeal);

    //   const meals = addMeal.map((meal) => ({
    //     ...meal,
    //     mealDate: new Date().toISOString().split("T")[0], // Ensure correct meal date
    //   }));

    //   for (const meal of meals) {
    //     // Check if a total meal already exists for this member on the same date
    //     const existingTotalMeal = await mealColl.findOne({
    //       member_id: meal.member_id,
    //       mealDate: meal.mealDate,
    //       type: "total", // Ensure we're checking only total meals
    //     });

    //     if (meal.type === "guest") {
    //       // If adding a guest meal, ensure that a total meal exists first
    //       if (!existingTotalMeal) {
    //         return res
    //           .status(400)
    //           .send({
    //             error: "You must add a total meal before adding a guest meal.",
    //           });
    //       }
    //     }

    //     // Check if the same meal type (total/guest) already exists for this member on the same date
    //     const existingMeal = await mealColl.findOne({
    //       member_id: meal.member_id,
    //       mealDate: meal.mealDate,
    //       type: meal.type, // Ensure we differentiate between total and guest
    //     });

    //     if (meal.type === "total") {
    //       // First time adding a total meal (always starts with count = 1)
    //       if (!existingMeal) {
    //         meal.count = 1; // Initialize count to 1
    //         await mealColl.insertOne(meal);
    //       } else {
    //         // If the total meal exists, just increase the count
    //         await mealColl.updateOne(
    //           { _id: existingMeal._id },
    //           { $inc: { count: 1 } } // Increment the meal count
    //         );
    //       }
    //     } else if (meal.type === "guest") {
    //       // If it's the first guest meal, insert without count increment
    //       if (!existingMeal) {
    //         meal.count = 0; // Do not increment first guest meal
    //         await mealColl.insertOne(meal);
    //       } else {
    //         // If guest meal already exists, then increment count
    //         await mealColl.updateOne(
    //           { _id: existingMeal._id },
    //           { $inc: { count: 1 } } // Increment guest meal count
    //         );
    //       }
    //     }
    //   }

    //   res.send({ message: "Meals added successfully" });
    // });

    // app.post("/addMeal", async (req, res) => {
    //   const addMeal = req.body;
    //   console.log(addMeal);
    //   // Ensure each meal entry has a unique ObjectId
    //   const meals = addMeal.map((meal) => ({
    //     ...meal,

    //     mealDate: new Date().toISOString().split("T")[0], // Ensure correct meal date
    //   }));
    //   for (const meal of meals) {
    //     // Check if the meal already exists for this member on the same date
    //     const existingMeal = await mealColl.findOne({
    //       member_id: meal.member_id,
    //       mealDate: meal.mealDate,
    //       name: meal.name, // Optional: check for duplicate meal name
    //     });

    //     if (existingMeal) {
    //       // If the meal already exists, increment the meal count
    //       await mealColl.updateOne(
    //         { _id: existingMeal._id },
    //         { $inc: { count: 1 } } // Increment the meal count
    //       );
    //     } else {
    //       // If no existing meal found, insert a new meal with count = 1
    //       meal.count = 1; // Initialize count to 1 for a new meal
    //       await mealColl.insertOne(meal);
    //     }
    //   }
    //   res.send({ message: "Meals added successfully" });
    // });

    // meal show

    // const { date } = req.query;

    // if (!date) {
    //   return res.status(400).json({ message: "Meal date is required" });
    // }

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

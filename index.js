
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB URI from .env
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tkd5xye.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const courseCollection = client.db("Academix").collection("course");
    const enrollmentCollection = client
      .db("Academix")
      .collection("enrollments");

    // GET all courses or filter by instructor email
    app.get("/courses", async (req, res) => {
      const email = req.query.email;
      const query = { instructor_email: email };
      const result = await courseCollection.find(query).toArray();
      res.send(result);
    });

    // GET single course by ID
    app.get("/courseDetails/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query ={ _id:id }
        const course = await courseCollection.findOne(query);
          
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }
        res.send(course);
      } catch (error) {
        console.error("Error fetching course by ID:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });


    // GET limited courses (top 6)
    app.get("/api/courses", async (req, res) => {
      try {
        const result = await courseCollection.find().limit(6).toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
      }
    });
    
    app.get("/courses", async (req, res) => {
  try {
    const email = req.query.email;
    let query = {};
    if (email) {
      query = { instructor_email: email };
    }
    const result = await courseCollection.find(query).toArray();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

    // delete course id
    app.delete("/courses/:id", async (req, res) => {
  const id = req.params.id;
  const result = await courseCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});


    // GET enrollments for a student
    app.get("/enrollments", async (req, res) => {
      
      const email = req.query.email;
      

      const requests = await enrollmentCollection
        .find({userEmail: email })
        .toArray();
      res.send(requests);
      

    });

    // POST new enrollment
    app.post("/enroll", async (req, res) => {
      const enrollment = req.body;
      const result = await enrollmentCollection.insertOne(enrollment);
      res.send(result);
    });
    // POST addCourse
    app.post("/courses", async (req, res) => {
      const post = req.body;
      
      const result = await courseCollection.insertOne(post);
      res.send(result);
    });
   
 // DELETE enrollment by ID
app.delete("/api/my-enrollments/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await enrollmentCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to delete enrollment", error: err.message });
  }
});

    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("📘 Course API Server Running!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
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
    const instructorCollection = client
      .db("Academix")
      .collection("instructors");
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
        const query = { _id: id };
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
    // GET popular courses for a user by their email
    app.get("/api/my-popular-courses", async (req, res) => {
      try {
        const userEmail = req.query.email;
        if (!userEmail) {
          return res
            .status(400)
            .json({ error: "Email query param is required" });
        }

        const pipeline = [
          {
            $match: { userEmail: userEmail },
          },
          {
            $group: {
              _id: "$courseId",
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "enrollments",
              localField: "_id",
              foreignField: "courseId",
              as: "allEnrolls",
            },
          },
          {
            $addFields: {
              totalEnrollCount: { $size: "$allEnrolls" },
            },
          },
          {
            $sort: { totalEnrollCount: -1 },
          },
          {
            $limit: 6,
          },
          {
            $lookup: {
              from: "course",
              localField: "_id",
              foreignField: "_id",
              as: "courseDetails",
            },
          },
          { $unwind: "$courseDetails" },
          {
            $project: {
              _id: "$courseDetails._id",
              title: "$courseDetails.title",
              image: "$courseDetails.image",
              shortDescription: "$courseDetails.shortDescription",
              category: "$courseDetails.category",
              level: "$courseDetails.level",
              duration: "$courseDetails.duration",
              instructor_email: "$courseDetails.instructor_email",
              seats: "$courseDetails.seats",
              enrolledCount: "$courseDetails.enrolledCount",
              totalEnrollCount: 1,
            },
          },
        ];

        const popularCourses = await enrollmentCollection
          .aggregate(pipeline)
          .toArray();
        res.json(popularCourses);
      } catch (error) {
        console.error("Error in /api/my-popular-courses:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // GET limited courses 
    app.get("/api/courses", async (req, res) => {
      try {
        const result = await courseCollection.find().toArray();
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
      const result = await courseCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.get("/enrollments", async (req, res) => {
      const email = req.query.email;

      try {
        const enrollments = await enrollmentCollection
          .aggregate([
            {
              $match: { userEmail: email },
            },
            {
              $lookup: {
                from: "course",
                localField: "courseId",
                foreignField: "_id",
                as: "courseData",
              },
            },
            {
              $unwind: "$courseData",
            },
            {
              $project: {
                _id: 1,
                userEmail: 1,
                courseId: 1,
                enrolledAt: 1,
                title: "$courseData.title",
                image: "$courseData.image",
                instructorName: "$courseData.instructorName",
                category: "$courseData.category",
                level: "$courseData.level",
                duration: "$courseData.duration",
                seats: "$courseData.seats",
                enrolledCount: "$courseData.enrolledCount",
                shortDescription: "$courseData.shortDescription",
              },
            },
          ])
          .toArray();

        res.send(enrollments);
      } catch (error) {
        console.error(
          "Failed to aggregate enrollments with course info:",
          error
        );
        res.status(500).send({ error: "Internal Server Error" });
      }
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
        const result = await enrollmentCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (err) {
        res
          .status(500)
          .json({ message: "Failed to delete enrollment", error: err.message });
      }
    });
    // ✅ GET route for instructors
    app.get("/api/instructors", async (req, res) => {
      try {
        const instructors = await instructorCollection.find().toArray();
        res.send(instructors);
      } catch (err) {
        console.error("Error fetching instructors:", err);
        res.status(500).send({ error: "Failed to fetch instructors" });
      }
    });
    // PUT update course by ID
    app.put("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      try {
        const result = await courseCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              title: updatedData.title,

              detailedDescription: updatedData.detailedDescription,
              instructorName: updatedData.instructorName,
              duration: updatedData.duration,
              image: updatedData.image,
            },
          }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "Course not found or no change made." });
        }

        res.json({ message: "Course updated successfully", result });
      } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // DELETE a course by ID
    app.delete("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const result = await courseCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
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

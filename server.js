const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const propertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
let propertiesPath = path.resolve(__dirname, "config/db.properties");
let properties = propertiesReader(propertiesPath);

// Database Configuration
const dbPrefix = properties.get("db.prefix");
const dbUsername = encodeURIComponent(properties.get("db.user"));
const dbPwd = encodeURIComponent(properties.get("db.pwd"));
const dbName = properties.get("db.dbName");
const dbUrl = properties.get("db.dbUrl");
const dbParams = properties.get("db.params");
const uri = `${dbPrefix}${dbUsername}:${dbPwd}${dbUrl}${dbParams}`;

let db;

// Middleware Setup
app.use(morgan("short"));
app.use(cors());
app.use(express.json());

// MongoDB Connection
async function connectToDatabase() {
  try {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    await client.connect();
    db = client.db(dbName);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1); // Exit the app if the connection fails
  }
}

// Middleware to set collection
app.param("collectionName", function (req, res, next, collectionName) {
  req.collection = db.collection(collectionName);
  next();
});

// Routes
app.get("/", (req, res) => {
  res.send("Welcome! Select a collection, e.g., /collections/Lessons");
});

app.get("/collections/:collectionName", async (req, res, next) => {
  try {
    const results = await req.collection.find({}).toArray();
    res.send(results);
  } catch (err) {
    next(err);
  }
});

app.get("/collections/:collectionName/:id", async (req, res, next) => {
  try {
    const result = await req.collection.findOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  } catch (err) {
    next(err);
  }
});

app.post("/collections/:collectionName", async (req, res, next) => {
  try {
    const result = await req.collection.insertOne(req.body);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

app.put("/collections/:collectionName/:id", async (req, res, next) => {
  try {
    const result = await req.collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send(result.matchedCount === 1 ? { msg: "success" } : { msg: "error" });
  } catch (err) {
    next(err);
  }
});

app.delete("/collections/:collectionName/:id", async (req, res, next) => {
  try {
    const result = await req.collection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result.deletedCount === 1 ? { msg: "success" } : { msg: "error" });
  } catch (err) {
    next(err);
  }
});

app.use("/Images", express.static(path.resolve(__dirname, "images")));

app.use((req, res) => {
  res.status(404).send("File Not Found!");
});

(async () => {
  await connectToDatabase();
  app.listen(3000, () => {
    console.log("App started on port 3000");
  });
})();

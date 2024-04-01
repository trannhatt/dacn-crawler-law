const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://devtest:dev123@law.tfz4t8e.mongodb.net/?retryWrites=true&w=majority&appName=Law";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

exports.run = async function () {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    return client;
  } catch (error) {
    console.error("Error occurred while connecting to MongoDB:", error);
    throw error;
  }
};

exports.saveData = async function (data) {
  try {
    const client = await exports.run();
    const db = client.db("law_dev");
    const collection = db.collection("laws");
    const existingData = await collection.findOne({
      tenVanBan: data.tenVanBan,
    });
    if (existingData) {
      console.log("Văn bản này đã được crawl", data.tenVanBan);
      return;
    }
    await collection.insertOne(data);
    // console.log("Data saved to MongoDB:", data);
  } catch (error) {
    console.error("Error occurred while saving data to MongoDB:", error);
    throw error;
  }
};

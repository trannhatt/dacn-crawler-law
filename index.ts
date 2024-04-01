const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const axios = require("axios");
const cheerio = require("cheerio");
const { run, saveData } = require("./services/database.service.ts");
const { ObjectId } = require("mongodb");
const moment = require("moment-timezone");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("views"));

app.post("/crawl", async (req, res) => {
  const link = req.body.link;

  try {
    const response = await axios.get(link);
    const html = response.data;

    const $ = cheerio.load(html);

    const soHieu = $("td:contains('Số hiệu:')").next().text().trim();
    const loaiVanBan = $("td:contains('Loại văn bản:')").next().text().trim();
    const coQuanBanHanh = $("td:contains('Nơi ban hành:')")
      .next()
      .text()
      .trim();
    const ngayBanHanh = $("td:contains('Ngày ban hành:')").next().text().trim();
    const tenVanBan = $("title").text().trim();
    const noiDungVanBan = $(".content1").html();

    // Lấy thời gian hiện tại theo múi giờ của Việt Nam
    const now = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss");

    const crawledData = {
      link: link,
      tenVanBan: tenVanBan,
      sohieu: soHieu,
      loaiVanBan: loaiVanBan,
      coQuanBanHanh: coQuanBanHanh,
      ngayBanHanh: ngayBanHanh,
      noiDungVanBan: noiDungVanBan,
      ngayThem: now, // Thêm ngày tạo vào dữ liệu thu thập
    };

    await saveData(crawledData);

    res.send("Crawled: " + link);
  } catch (error) {
    console.error("Error occurred while crawling and saving data:", error);
    res.status(500).send("Internal server error");
  }
});

app.get("/document", async (req, res) => {
  try {
    const client = await run();
    const db = client.db("law_dev");
    const collection = db.collection("laws");
    const document = await collection.findOne(
      {},
      { projection: { _id: 0, noiDungVanBan: 1 } }
    );

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({ noiDungVanBan: document.noiDungVanBan });
  } catch (error) {
    console.error("Error fetching document from MongoDB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/document-summary", async (req, res) => {
  try {
    const client = await run();
    const db = client.db("law_dev");
    const collection = db.collection("laws");
    const documents = await collection
      .find({}, { projection: { _id: 1, noiDungVanBan: 0 } })
      .toArray();

    if (!documents || documents.length === 0) {
      return res.status(404).json({ error: "Documents not found" });
    }
    res.json(documents);
  } catch (error) {
    console.error("Error fetching document summary from MongoDB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/document-detail", async (req, res) => {
  try {
    const documentId = req.query.id;
    const client = await run();
    const db = client.db("law_dev");
    const collection = db.collection("laws");
    const objectId = new ObjectId(documentId);
    const document = await collection.findOne(
      { _id: objectId },
      { projection: { _id: 0, noiDungVanBan: 1 } }
    );

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(document);
  } catch (error) {
    console.error("Error fetching document detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/delete-document", async (req, res) => {
  try {
    const documentId = req.query.id;
    const client = await run();
    const db = client.db("law_dev");
    const collection = db.collection("laws");
    const objectId = new ObjectId(documentId);
    const result = await collection.deleteOne({ _id: objectId });

    if (result.deletedCount === 1) {
      res.status(200).send("Document deleted successfully");
    } else {
      res.status(404).send("Document not found");
    }
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

run()
  .then(() => {
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Error occurred while connecting to MongoDB:", error);
    process.exit(1);
  });

/* crete .env fiile in root directory
 * PORT = 8080;
 * BASE_URL = "http://localhost:8080";
 * OPENAI_API_KEY = "YOUR API KEY";
 */

const express = require("express");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const { PDFExtract } = require("pdf.js-extract");
const app = express();

app.use(express.json()); //accept json data in requests

//environment variables
dotenv.config();

//OpenAIApi Configuration
const OpenAI = require("openai");

//build openai instance using OpenAIApi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ dest: path.join(__dirname, "pdfs") });

app.post("/api/summarizer", upload.single("pdf"), async (req, res) => {
  try {
    // res.json({ file: req.file, body: req.body });
    const { maxWords } = req.body;
    const pdfFile = req.file;

    //extract text from the pdf file
    const pdfExtract = new PDFExtract();

    const extractOptions = {
      firstPage: 1,
      lastPage: undefined,
      password: "",
      verbosity: -1,
      normalizeWhitespace: false,
      disableCombinedTextItems: false,
    };

    const data = await pdfExtract.extract(pdfFile.path, extractOptions);

    const pdfText = data.pages
      .map((page) => page.content.map((item) => item.str).join(" "))
      .join(" ");

    //if there is no text extracted return an error
    if (pdfText.length === 0) {
      res.json({
        error:
          "Text could not be extracted from this PDF. Please try another PDF.",
      });
      return;
    }

    let summarisedText = pdfText;

    res.json({ summarisedText });
  } catch (error) {
    console.error("An error occured:", error);
    res.status(500).json({ error });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));

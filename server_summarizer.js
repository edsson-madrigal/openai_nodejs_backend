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
const { encode } = require("gpt-3-encoder");

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

const calculateTokens = (text) => encode(text).length;
//const upload = multer({ dest: path.join(__dirname, "pdfs") });
let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "pdfs"));
  },
  filename: function (req, file, cb) {
    let extArray = file.mimetype.split("/");
    let extension = extArray[extArray.length - 1];
    cb(null, Date.now() + "." + extension);
  },
});
const upload = multer({ storage: storage });

// Split the sentence into multiple chunks if it exceeds the token limit
const splitSentence = (sentence, maxChunkSize) => {
  //Define an array variable: chunks where we will store all the chunks
  const sentenceChunks = [];

  //Define a string variable: current Chunk where we will store the chunk being built
  //before inserting it into the chunks array
  let partialChunk = "";

  //get all words in the text and store them inside a variable: words
  const words = sentence.split(" ");

  //Loop over the words
  words.forEach((word) => {
    //For each word:
    //if the number of tokens in the combination of partialChunk and word < 2000
    //keep adding words to the partialChunk
    //otherwise add the word to the partialChunk and insert ouput into sentenceChunks

    if (calculateTokens(partialChunk + word) < maxChunkSize) {
      partialChunk += word + " ";
    } else {
      sentenceChunks.push(partialChunk.trim());
      partialChunk = word + " "; //set the new chunk to the word
    }
  });
  if (partialChunk) {
    sentenceChunks.push(partialChunk.trim());
  }

  //return the sentenceChunks array
  return sentenceChunks;
};
const splitTextIntoChunks = (text, maxChunkSize) => {
  //Define an array variable: chunks where we will store all the chunks
  const chunks = [];

  //Define a string variable: current Chunk where we will store the chunk being built
  //before inserting it into the chunks array
  let currentChunk = "";

  //get all sentences in the text and store them inside a variable: sentences
  const sentences = text.split(".");

  //Loop over the sentences
  sentences.forEach((sentence) => {
    //For each sentence:
    //if the number of tokens in the combination of currentChunk and sentence < 2000
    //keep adding sentences to the currentChunk
    //otherwise add the sentence to the current chunk and insert ouput into chunks

    if (calculateTokens(currentChunk) > maxChunkSize) {
      let sentenceChunks = splitSentence(currentChunk, maxChunkSize);
      chunks.push(...sentenceChunks);
      currentChunk = sentence + ".";
    } else if (calculateTokens(currentChunk + sentence) < maxChunkSize) {
      currentChunk += sentence + ".";
    } else {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + "."; //set the new chunk to the sentence
    }
  });
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  return chunks;

  //if at the start of building a new chunk,
  //the first sentence that has been inserted to the currentCheck is over 2000 tokens,
  //split that sentence to chunks and insert them into the chunks array

  //return the chunks array
};

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
    const chunks = splitTextIntoChunks(pdfText, 2000);
    const tokens = chunks.map((chunk) => encode(chunk).length);
    res.json({ chunks, tokens });

    //res.json({ summarisedText });
  } catch (error) {
    console.error("An error occured:", error);
    res.status(500).json({ error });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));

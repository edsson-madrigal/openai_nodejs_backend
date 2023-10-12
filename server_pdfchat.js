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

//***********************************************************//
//********************* PDFChat project *********************//
//***********************************************************//

const calculateTokens = (text) => encode(text).length;

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
      partialChunk += word + ".";
    } else {
      sentenceChunks.push(partialChunk.trim());
      partialChunk = word + "."; //set the new chunk to the word
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
      const sentenceChunks = splitSentence(currentChunk, maxChunkSize);
      chunks.push(...sentenceChunks);
    }

    if (calculateTokens(currentChunk + sentence) < maxChunkSize) {
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

const upload2 = multer({ dest: path.join(__dirname, "pdfs") });
app.post("/api/upload-pdf", upload2.single("pdf"), async (req, res) => {
  try {
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

    // Split the PDF text into chunks
    const chunks = splitTextIntoChunks(pdfText, 512);

    //generate a random table name of 10 characters.
    const generateRandomTableName = require("./utils/generateRandomTableName");
    const table_name = generateRandomTableName();

    //calculate embeddings of the chunks and store them inside a table
    const createEmbeddings = require("./utils/createEmbeddings2");
    await createEmbeddings(chunks, table_name);

    // Return a JSON response with the table name and original name of the pdf file
    res.json({ table_name, filename: pdfFile.originalname });
  } catch (error) {
    console.error("An error occured:", error);
    res.status(500).json({ error });
  }
});

app.post("/api/pdf-chat", async (req, res) => {
  try {
    const { text, tableName } = req.body;

    async function runCompletion(text, context) {
      //console.log(context);
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        messages: [
          {
            role: "system",
            content: `Answer questions based on information included in the provided context. If the information is not available in the provided context, answer saying that the information is not available in the PDF document. Here is the context: ###${context}###`,
          },
          { role: "user", content: text },
        ],
        temperature: 1,
        max_tokens: 200,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      return response;
    }

    //get embedding of text
    const getEmbedding = require("./utils/getEmbedding");
    const embedding = await getEmbedding(text);

    //get embeddings from the tableName table
    const getEmbeddings = require("./utils/getEmbeddingsDB2");
    const embeddings = await getEmbeddings(tableName);

    //find nearest neighbours
    const findNearestNeighbors = require("./utils/nearestNeighbours2.js");
    const nearestNeighbours = findNearestNeighbors({
      embedding,
      embeddings,
      k: 3,
    });

    // TODO ** make sure you keep the original order <<< edsson
    //build the context
    const contextArray = [];
    nearestNeighbours.forEach((neighbour, index) => {
      console.log(`Similarity ${index + 1}: ${neighbour.similarity}`);
      contextArray.push(
        `\nabstract ${index + 1}: """${neighbour?.text || ""}"""`
      );
    });

    const context = contextArray.join(" ");

    // Pass the request text and context to the runCompletion function
    const completion = await runCompletion(text, context);

    // Return the completion as a JSON response
    res.json({ data: completion });
  } catch (error) {
    console.error("An error occured", error);
    res.status(500).json({
      error: {
        message: "An error occurred during your request.",
      },
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));

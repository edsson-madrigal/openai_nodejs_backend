/* crete .env fiile in root directory
 * PORT = 8080;
 * BASE_URL = "http://localhost:8080";
 * OPENAI_API_KEY = "YOUR API KEY";
 */

//import modules: express, dotenv
const express = require("express");
const dotenv = require("dotenv");
const app = express();

//accept json data in requests
app.use(express.json());

//setup environment variables
dotenv.config();

//OpenAIApi Configuration
const OpenAI = require("openai");

//build openai instance using OpenAIApi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//build the runCompletion which sends a request to the OPENAI Completion API
async function runCompletion(prompt) {
  const response = await openai.completions.create({
    model: "text-davinci-003",
    prompt: prompt,
    temperature: 1,
    top_p: 1,
    n: 1,
    max_tokens: 50,
    frequency_penalty: 0,
    presence_penalty: 0,
    echo: true,
  });
  return response;
}

app.get("/api/chatgpt", async (req, res) => {
  console.log("GET request to /api/chatgpt");

  res.send("Hello World!");
});

//post request to /api/chatgpt
app.post("/api/chatgpt", async (req, res) => {
  console.log("POST request to /api/chatgpt");

  try {
    //extract the text from the request body
    const { text } = req.body;
    console.log("Input: ", text);

    // Pass the request text to the runCompletion function
    const completion = await runCompletion(text);
    console.log("Output: ", completion);

    // Return the completion as a JSON response
    res.json({ data: completion });
  } catch (error) {
    console.log("Error: ", error);

    //handle the error in the catch statement
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error("Error with OPENAI API request:", error.message);
      res.status(500).json({
        error: {
          message: "An error occured during your request.",
        },
      });
    }
  }
});

//set the PORT
const PORT = process.env.PORT || 5000;

//start the server on the chosen PORT
app.listen(PORT, console.log(`Server started on port ${PORT}`));

////////////////////////////
// getting number of tokens
const OpenAI_encoder = require("gpt-3-encoder");

const x = OpenAI_encoder.encode("This is some text");
const cost_per_token = 1.5 / 1000000;
console.log(
  `
Number Tokens: ${x.length}
TokensIDS: ${x}
Cost per query: $ ${4000 * cost_per_token} USD
  `
);

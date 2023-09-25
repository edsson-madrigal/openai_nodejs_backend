/* crete .env fiile in root directory
 * PORT = 8080;
 * BASE_URL = "http://localhost:8080";
 * OPENAI_API_KEY = "YOUR API KEY";
 */

const express = require("express");
const dotenv = require("dotenv");
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

//runCompletion
async function runCompletion(messages) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-16k",
    messages,
    temperature: 1,
    max_tokens: 50,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  return response;
}

app.post("/api/chatbot", async (req, res) => {
  try {
    const { messages } = req.body;

    // Pass the request text to the runCompletion function
    const completion = await runCompletion(messages);

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

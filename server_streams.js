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

//start stream
async function startCompletionStream(prompt) {
  const stream = await openai.chat.completions.create(
    {
      //https://platform.openai.com/docs/models/overview
      model: "gpt-3.5-turbo",
      messages: prompt,
      stream: true,
      max_tokens: 200,
    },
    {
      responseType: "stream",
    }
  );

  for await (const part of stream) {
    if (part?.choices[0]?.delta?.content) {
      process.stdout.write(part?.choices[0]?.delta?.content);
    }
  }
}

let prompt = [
  {
    role: "user",
    content: "Randomly list 3 countries and their capitals:",
  },
];
startCompletionStream(prompt);

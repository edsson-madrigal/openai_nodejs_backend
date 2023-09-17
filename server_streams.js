/* crete .env fiile in root directory
 * PORT = 8080;
 * BASE_URL = "http://localhost:8080";
 * OPENAI_API_KEY = "YOUR API KEY";
 */

//import modules: express, dotenv
const express = require("express");
const dotenv = require("dotenv");
const app = express();
const { EventEmitter } = require("events");

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

//Create an EventEmitter for sending stream data
const completionEmitter = new EventEmitter();

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
    const message = part.choices[0].delta.content;
    const finished = part.choices[0].finish_reason;

    if (finished === "stop") {
      console.log("\n\n**** FINISHED ****");
      completionEmitter.emit("done");
    } else if (message != undefined) {
      process.stdout.write(part?.choices[0]?.delta?.content);
      completionEmitter.emit("data", part); //Notify stream completion
    }

    // if (part?.choices[0]?.delta?.content) {
    //   process.stdout.write(part?.choices[0]?.delta?.content);
    // }
  }
}

// let prompt = [
//   {
//     role: "user",
//     content: "Randomly list 3 countries and their capitals:",
//   },
// ];
// startCompletionStream(prompt);

//post request to /api/chatgpt
app.post("/api/chatgpt", async (req, res) => {
  console.log("POST request to /api/chatgpt");

  try {
    //extract the text from the request body
    const { text } = req.body;
    let prompt = [
      {
        role: "user",
        content: text,
      },
    ];

    console.log("Input: ", prompt);

    // Pass the request text to the runCompletion function
    startCompletionStream(prompt);

    //listen to events
    const dataListener = (data) => {
      res.write(JSON.stringify(data));
    };
    const doneListener = () => {
      res.write('{"event":"done"}');
      res.end();
      //delete listeners
      completionEmitter.off("data", dataListener);
      completionEmitter.off("done", doneListener);
    };
    completionEmitter.on("data", dataListener);
    completionEmitter.on("done", doneListener);
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));

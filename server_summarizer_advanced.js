/* crete .env fiile in root directory
 * PORT = 8080;
 * BASE_URL = "http://localhost:8080";
 * OPENAI_API_KEY = "YOUR API KEY";
 */

const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { PDFExtract } = require("pdf.js-extract");
const { encode } = require("gpt-3-encoder");
const fs = require("fs").promises;

//environment variables
dotenv.config();

//OpenAIApi Configuration
const OpenAI = require("openai");

//build openai instance using OpenAIApi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const aiChat = async (story, prevStory, $i) => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  let messages = [];
  let tTokens = 0;

  if ($i == 1) {
    messages = [
      {
        role: "system",
        content: `You are a Abridger. You are reading a story and summarizing it.`,
      },
      {
        role: "system",
        content: `Story: ${story}`,
      },

      {
        role: "user",
        content: `
          please follow the instructions below to summarize the story.
          1. Read the story.
          2. Generate a detailed and factual bullet-point summary 
          3. Do not put numbers on the bullet points
          4. Do not put the same bullet point twice
          5. Do not put bullet points that are not in the story
          6. Do not put bullet points that are not factual
          7. No comments between bullet points.
          8. no extra spaces between bullet points.
          9. do not repeat information in the bullet points.
          `,
      },
    ];
  } else {
    messages = [
      {
        role: "system",
        content: `You are a Abridger. You are reading a story and summarizing it. Always use bulltet points`,
      },
      {
        role: "system",
        content:
          "Summarized Story so far use it as context to help you summarize the non bulleted story: ``` " +
          prevStory +
          "```",
      },

      {
        role: "user",
        content: `
          please follow the instructions below to summarize the story.
          1. Read the story.
          2. Generate a detailed and factual bullet-point summary 
          3. Do not put numbers on the bullet points
          4. Do not put the same bullet point twice
          5. Do not put bullet points that are not in the story
          6. Do not put bullet points that are not factual
          7. No comments between bullet points.
          8. no extra spaces between bullet points.
          9. do not repeat information in the bullet points.
          10. Just summarize the story bellow.
          11. Use the bulleted story as context to help you summarize the non bulleted story.

          Story: \`\`\`${story}\`\`\`
          `,
      },
    ];
  }

  // calculate tokens in messages
  messages.forEach((message) => {
    tTokens += encode(message.content).length;
  });
  console.log(
    `
Prev Tokens: ${encode(messages[1].content).length} 
New Tokens: ${encode(messages[2].content).length} 
Total Tokens ${tTokens}`
  );

  try {
    // Making a request to the OpenAI API to summarise the chunk

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      messages: messages,
      temperature: 1,
      max_tokens: 8000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    //return the summary
    console.log(`${response.choices[0].message.content}\n`);
    return response.choices[0].message.content;
  } catch (error) {
    console.log("summarizeChunk error", error);
    throw new Error(error);
  }
};

async function readFilesInDirectory(directoryPath) {
  const files = await fs.readdir(directoryPath);
  let i = 0;
  let response = "";
  for (const file of files) {
    // check if file starts with 'W'
    if (!file.startsWith("C")) continue;
    console.log(`Reading ${file}`);

    const data = await fs.readFile(
      path.join(__dirname, `files/${file}`),
      "utf8"
    );
    response += (await aiChat(data, response, i)) + "\n";

    // Do something with the data if needed
  }
  i++;
  console.log(`
  **************************************************
  **************************************************
  **************************************************
  TOTAL TOKENS ${encode(response).length} 
  ${response}`);
}

const allFiles = path.join(__dirname, "files"); // adjust the path as needed
readFilesInDirectory(allFiles);

const dotenv = require("dotenv");
const path = require("path");
//environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });
//OpenAIApi Configuration
//OpenAIApi Configuration
const OpenAI = require("openai");

//build openai instance using OpenAIApi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getEmbedding = async (text, model = "text-embedding-ada-002") => {
  //replace newlines with space
  const cleanedText = text.replace(/\n/g, " ");

  //create embedding using OPENAI API
  const response = await openai.embeddings.create({
    model: model,
    input: cleanedText,
  });
  console.log(response.data);
  return response.data[0].embedding;
};
module.exports = getEmbedding;

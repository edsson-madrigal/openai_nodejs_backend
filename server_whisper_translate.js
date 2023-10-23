const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
//environment variables
dotenv.config();

//OpenAIApi Configuration
const OpenAI = require("openai");

//build openai instance using OpenAIApi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//***********************************************************************//
//********************* Whisper Translate Audio ************************//
//***********************************************************************//

//Upload middleware which will handle the file uplaods to the whisper folder
const upload3 = multer({ dest: path.join(__dirname, "tmp") });

app.post(
  "/api/whisper-translate",
  upload3.single("audio"),
  async (req, res) => {
    try {
      // Extract language and prompt from the request body
      const { prompt } = req.body;

      // Log the uploaded file information (for debugging purposes)
      console.log(req.file);

      // Extract the path and original name of the uploaded audio file
      const { path: audioPath, originalname: originalFileName } = req.file;

      // Log the temporary path of the uploaded audio file (for debugging purposes)
      console.log(audioPath);

      // Get the file extension from the original file name
      const fileExtension = path.extname(originalFileName);

      // Generate a random file name and combine it with the file extension
      const randomFileName = `${Math.random()
        .toString(36)
        .substring(2)}${fileExtension}`;

      // Create a new path for the audio file in the 'whisper' directory
      const newPath = path.join(__dirname, "tmp", randomFileName);

      // Move the uploaded file to the new path
      await fs.promises.rename(audioPath, newPath);

      // Log the new path of the audio file (for debugging purposes)
      console.log(newPath);

      // Create a function run that sends the transcription request to OPENAI

      // IMPORTANT try also the audio.transcriptions.create
      async function run(newPath) {
        const response = await openai.audio.translations.create({
          file: fs.createReadStream(newPath),
          model: "whisper-1",
          // prompt is used to help the ai identify words that are not in the vocabulary
          prompt: prompt,
          //language: "ja", // only for transcriptions
        });
        return response;
      }

      // Pass the new audio file path to the run function
      const output = await run(newPath);

      // Return the output as a JSON response
      console.log(output);
      res.json(output);
    } catch (error) {
      console.error("An error occurred:", error);
      res.status(500).json({ error: "Transcription failed." });
    }
  }
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));

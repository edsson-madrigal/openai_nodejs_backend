const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

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

//*********************************************************************//
//********************* DALLE Image Generation v1 *********************//
//*********************************************************************//

app.post("/api/create-images", async (req, res) => {
  //extract the text input from the request body
  const { text } = req.body;
  //createImages
  async function createImages(prompt) {
    const response = await openai.images.generate({
      prompt: text,
      n: 3,
      size: "256x256",
      response_format: "url", //default
    });
    return response;
  }
  try {
    const { text } = req.body;

    // Pass the request text to the runCompletion function
    const output = await createImages(text);
    console.log(output);
    // Return the completion as a JSON response
    res.json(output);
  } catch (error) {
    console.error("An error occured:", error);
    res.status(500).json({ error });
  }
});

//*********************************************************************//
//********************* DALLE Image Storage v1 ************************//
//*********************************************************************//

const fs = require("fs");
const axios = require("axios");
app.post("/api/save-image", async (req, res) => {
  // Create the directory dalle_images if it doesn't exist
  const imageDirectory = path.join(__dirname, "tmp");
  if (!fs.existsSync(imageDirectory)) {
    fs.mkdirSync(imageDirectory);
  }

  try {
    // Extract the fileName and imageUrl from the request body
    const { fileName, imgURL } = req.body;

    // Construct the image path using the imageDirectory and fileName
    const imagePath = path.join(imageDirectory, fileName);

    // Check if the file already exists
    const fileExists = fs.existsSync(imagePath);
    console.log(imagePath);

    if (fileExists) {
      // Throw an error if an image with the same name already exists
      throw new Error("Image with the same name already exists");
    }

    // Create a writable stream for the image file using the image path
    const writer = fs.createWriteStream(path.join(imageDirectory, fileName));

    // Fetch the image from the imageUrl using axios
    //with the responseType set to 'stream'
    const response = await axios({
      method: "GET",
      url: imgURL,
      responseType: "stream",
    });

    if (response.status !== 200) {
      // Throw an error if the image fetching failed
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }

    // Set up event handlers for the finish and error events of the writable stream

    writer.on("finish", () => {
      // Handle the finish event, which indicates that the image has been saved successfully
      console.log("Image saved successfully: ", fileName);
      res.json({ message: "Image saved successfully" });
    });

    writer.on("error", (err) => {
      // Handle any errors that occur during the writing process
      console.log("Error saving the image ", err.message);
      throw new Error(err.message);
    });

    // Pipe the response data stream to the writable stream to save the image
    response.data.pipe(writer);
  } catch (error) {
    // Handle any errors that occur during the image saving process
    console.error("An error occured:", error);
    res.status(500).json({ error });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));

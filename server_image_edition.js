const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

const app = express();
//environment variables
dotenv.config();

//OpenAIApi Configuration
const OpenAI = require("openai");

//build openai instance using OpenAIApi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//*********************************************************************//
//********************* DALLE Image Storage v1 ************************//
//*********************************************************************//
const fs = require("fs");
const axios = require("axios");

app.post("/api/save-image", express.json(), async (req, res) => {
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

//*********************************************************************//
//********************* DALLE Image Editing ***************************//
//*********************************************************************//

const bodyParser = require("body-parser");
const sharp = require("sharp");

const { loadImage, createCanvas } = require("canvas");

app.post(
  "/api/image-edit",
  bodyParser.json({ limit: "50mb" }),
  async (req, res) => {
    try {
      //extract imageURL, points and prompt from the request body
      const { imageURL, points, prompt } = req.body;

      //create a directory to store original images
      const imageDirectory = path.join(__dirname, "tmp");

      //create a random name for the original image made of 13 characters + timestamp
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const imageName = `${timestamp}_${randomString}`;

      //build the original image path using the image name
      const originalImagePath = path.join(
        imageDirectory,
        `${imageName}_original.png`
      );

      //save the original image to the original image path built above
      const imageBuffer = await axios.get(imageURL, {
        responseType: "arraybuffer",
      });
      fs.writeFileSync(
        originalImagePath,
        Buffer.from(imageBuffer.data, "binary")
      );

      // Load the image using the canvas library
      const image = await loadImage(originalImagePath);

      // Create a canvas of the same dimensions as the image
      const canvas = createCanvas(image.width, image.height);

      //create a drawing context
      const ctx = canvas.getContext("2d");

      // Draw the original image on the canvas
      ctx.drawImage(image, 0, 0);

      // Create a path using the mask points received from the request body
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();

      // Apply the mask by setting the path as a clipping region
      ctx.clip();

      // Clear the masked area to make it fully transparent
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save the modified image to the specified file path
      const imagePath = path.join(imageDirectory, `${imageName}.png`);
      const writer = fs.createWriteStream(imagePath);
      const stream = canvas.createPNGStream();
      stream.pipe(writer);

      // Set up event handlers for the finish and error events of the writable stream

      writer.on("finish", async () => {
        // Handle the finish event, which indicates that the image has been saved successfully
        console.log("Image masked successfully", imagePath);

        async function run(prompt, imagePath) {
          // Convert the input image to RGBA format
          const convertedImagePath = imagePath.replace(".png", "_rgba.png");
          await sharp(imagePath).ensureAlpha().toFile(convertedImagePath);
          const response = await openai.images.edit({
            image: fs.createReadStream(convertedImagePath),
            prompt: prompt,
            n: 1,
            size: "512x512",
          });
          //Deleted the converted image file after processing
          fs.unlinkSync(convertedImagePath);

          return response;
        }
        try {
          // Send request to OPENAI to edit the masked image
          const output = await run(prompt, imagePath);
          // Return the output as a JSON response
          console.log(output);
          res.json(output);
        } catch (error) {
          console.log("error: ", error);
          res.status(500).json(error);
        }
      });

      writer.on("error", (err) => {
        // Handle any errors that occur during the writing process
        console.log("Error saving the image ", err.message);
        throw new Error(err.message);
      });
    } catch (error) {
      console.error("An error occured:", error);
      res.status(500).json({ error });
    }
  }
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));

const fs = require("fs");
const path = require("path");

const getBooksArray = () => {
  try {
    //read json file
    const filePath = path.join(__dirname, "../parsed/books_data.json");

    jsonData = fs.readFileSync(filePath, "utf-8");
    const dataArray = JSON.parse(jsonData);
    return dataArray;
  } catch (error) {
    console.error("Error parsing JSON file:", error);
    return [];
  }
};

module.exports = getBooksArray;

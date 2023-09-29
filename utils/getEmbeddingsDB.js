const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const getEmbeddingsDB = async () => {
  // Get the absolute path to the SQLite database file
  const dbPath = path.join(__dirname, "../parsed/book_embeddings_cache.sqlite");

  // Create or open the SQLite database
  const db = new sqlite3.Database(dbPath);

  try {
    // Select all rows in the "embeddings_text_embedding_ada_002" table
    const getRows = () => {
      return new Promise((resolve, reject) => {
        db.all(
          `SELECT * FROM embeddings_text_embedding_ada_002`,
          (error, rows) => {
            if (error) {
              reject(error);
            } else {
              resolve(rows);
            }
          }
        );
      });
    };
    const rows = await getRows();

    return rows;
  } catch (error) {
    console.error("Error retrieving embeddings:", error);
  } finally {
    // Close the database connection
    db.close();
  }
};

module.exports = getEmbeddingsDB;

// const run = async () => {
//   const embeddings = await getEmbeddingsDB();
//   console.log(embeddings);
// };
// run()
//   .then(() => {
//     console.log("embeddings retrieved successfully");
//   })
//   .catch((error) => {
//     console.error("An error occurred:", error);
//   });

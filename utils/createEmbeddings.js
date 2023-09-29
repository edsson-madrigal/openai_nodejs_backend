const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const getEmbedding = require("../utils/getEmbedding.js");
const getBooksArray = require("./getBooksArray.js");
const getSubset = require("./getSubset.js");

const createEmbeddings = async (books) => {
  // Get the absolute path to the SQLite database file
  const dbPath = path.join(__dirname, "../parsed/book_embeddings_cache.sqlite");

  // Create or open the SQLite database
  const db = new sqlite3.Database(dbPath);

  try {
    // Delete the "embeddings_text_embedding_ada_002" table if it exists
    await new Promise((resolve, reject) => {
      db.run(
        `DROP TABLE IF EXISTS embeddings_text_embedding_ada_002`,
        (error) => (error ? (console.log(error), reject(error)) : resolve())
      );
    });

    // Create the "embeddings_text_embedding_ada_002" table
    await new Promise((resolve, reject) => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS embeddings_text_embedding_ada_002 (
          id INTEGER PRIMARY KEY,
          text TEXT,
          embedding TEXT,
          title TEXT,
          authors TEXT,
          image TEXT,
          publisher TEXT,
          infoLink TEXT
        )
      `,
        (error) => (error ? (console.log(error), reject(error)) : resolve())
      );
    });

    // Prepare the SQL statement for inserting data into the table
    const stmt = db.prepare(
      "INSERT INTO embeddings_text_embedding_ada_002 (text, embedding, title, authors, image, publisher, infoLink) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    for (let i = 0; i < books.length; i++) {
      //calculate embedding of the book's description
      const text = books[i].description;
      const embedding = await getEmbedding(text);
      const title = books[i].Title;
      const authors = books[i].authors;
      const image = books[i].image;
      const publisher = books[i].publisher;
      const infoLink = books[i].infoLink;

      // Insert the data into the embeddings_text_embedding_ada_002 table
      await new Promise((resolve, reject) => {
        stmt.run(
          text,
          JSON.stringify(embedding),
          title,
          authors,
          image,
          publisher,
          infoLink,
          (error) => {
            if (error) {
              console.error("Error inserting row:", error);
              reject(error);
            } else {
              resolve();
            }
          }
        );
      });
      console.log(`embedding ${i} inserted into the table.`);
    }

    // Finalize the statement
    stmt.finalize();
    console.log("Embeddings created and stored in SQLite database.");
  } catch (error) {
    console.error("Error creating embeddings:", error);
  } finally {
    // Close the database connection
    db.close();
  }
};

// module.exports = createEmbeddings;

const run = async () => {
  const books = getBooksArray();
  const filteredBooks = getSubset({ bookData: books, size: 30 });
  await createEmbeddings(filteredBooks);
};
run()
  .then(() => {
    console.log("Book processing completed.");
  })
  .catch((error) => {
    console.error("An error occurred:", error);
  });

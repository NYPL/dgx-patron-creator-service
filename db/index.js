/* eslint-disable */

const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/**
 * createTable()
 * Create the "barcodes" table if it's not already in the database.
 */
async function createTable() {
  const query = `
    CREATE TABLE barcodes (
      barcode VARCHAR(15) PRIMARY KEY NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp DEFAULT CURRENT_TIMESTAMP
    );`;
  try {
    const res = await pool.query(query);
    if (res.command === "CREATE") {
      console.log("database table 'barcodes' created");
    }
  } catch (error) {
    if (error.message === 'relation "barcodes" already exists') {
      console.log("database table barcodes already exists, continuing");
    }
  }
}

/**
 * initInsert()
 * Insert the first value into the database if it's not already there. This is
 * to set from where new barcodes will be created.
 */
async function initInsert() {
  const text = "INSERT INTO barcodes (barcode, used) VALUES ($1, $2);";
  const values = ["28888055432443", "true"];

  try {
    await pool.query(text, values);
  } catch (error) {
    console.log("barcodes table already has the initial value");
  }
}

let client;

async function init() {
  client = await pool.connect();
  await createTable();
  await initInsert();
}

init();

module.exports = {
  query: (text, params, callback) => client.query(text, params, callback),
  release: () => client.release(),
};

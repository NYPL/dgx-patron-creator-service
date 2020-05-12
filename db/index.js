/* eslint-disable */

const { Pool } = require("pg");

let database;

class BarcodesDb {
  constructor(args) {
    this.pool = new Pool({
      user: args["user"],
      host: args["host"],
      database: args["database"],
      password: args["password"],
      port: args["port"],
    });
  }

  async init() {
    await this.createTable();
    await this.initInsert();
  }

  /**
   * createTable()
   * Create the "barcodes" table if it's not already in the database.
   */
  async createTable() {
    const query = `
      CREATE TABLE barcodes (
        barcode VARCHAR(15) PRIMARY KEY NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP
      );`;
    try {
      const res = await this.pool.query(query);
      if (res.command === "CREATE") {
        console.log("database table 'barcodes' created");
      }
    } catch (error) {
      if (error.message === 'relation "barcodes" already exists') {
        console.log("database table barcodes already exists, continuing");
      }
    }
    return;
  }

  /**
   * initInsert()
   * Insert the first value into the database if it's not already there. This is
   * to set from where new barcodes will be created.
   */
  async initInsert() {
    const text = "INSERT INTO barcodes (barcode, used) VALUES ($1, $2);";
    const values = ["28888055432443", "true"];

    try {
      await this.pool.query(text, values);
    } catch (error) {
      console.log("barcodes table already has the initial value");
    }
    return;
  }

  async query(text, params, callback) {
    return this.pool.query(text, params, callback);
  }

  async release() {
    await this.pool.end();
  }
}

module.exports = (args) => {
  // If there's an issue calling this function because of nodejs
  // imports, ignore it.
  if (!args && !database) {
    return;
  }
  // If this was called correctly with arguments create the class and
  // return it. If this class was already created, return it and don't
  // create a new instance.
  database = database || new BarcodesDb(args);
  return database;
};

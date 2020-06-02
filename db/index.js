/* eslint-disable */
const logger = require("../api/helpers/Logger");
const { Pool } = require("pg");

let database;

class BarcodesDb {
  constructor(args) {
    console.log("db args", args);
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
        logger.debug("database table 'barcodes' created");
      }
    } catch (error) {
      console.log(error);
      if (error.message === 'relation "barcodes" already exists') {
        logger.error("database table barcodes already exists, continuing");
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
    const values = ["28888055432138", "true"];

    try {
      await this.pool.query(text, values);
      logger.debug("successfully inserted seed barcode");
    } catch (error) {
      logger.error("barcodes table already has the initial value");
    }
    return;
  }

  /**
   * query
   * Query the database and return the value.
   *
   * @param {string} text
   * @param {object} params
   * @param {function} callback
   */
  async query(text, params, callback) {
    return this.pool.query(text, params, callback);
  }

  /**
   * directQuery
   * Query the database but don't care about the value. This is for testing
   * and dropping the barcodes table in the test database.
   *
   * @param {string} query
   */
  async directQuery(query) {
    await this.pool.query(query);
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

let logger = require("../../../api/helpers/Logger");

describe("Logger", () => {
  it("should return a Winston logger", () => {
    expect(typeof logger).toBe("object");
    expect(logger.levels).toHaveProperty("info");
  });
});

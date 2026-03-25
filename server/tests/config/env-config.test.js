const { validateEnv, initEnv, getEnv } = require("../../config/env-config");

describe("Environment Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("validateEnv", () => {
    it("should validate all required environment variables successfully", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      const env = validateEnv();

      expect(env.MONGO_URI).toBe("mongodb://localhost:27017/soromint");
      expect(env.JWT_SECRET).toBe("test-secret-key");
      expect(env.SOROBAN_RPC_URL).toBe("https://soroban-testnet.stellar.org");
    });

    it("should use default values for optional variables", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      const env = validateEnv();

      expect(env.PORT).toBe(5000);
      expect(env.NODE_ENV).toBe(process.env.NODE_ENV || "development");
      expect(env.JWT_EXPIRES_IN).toBe("24h");
      expect(env.NETWORK_PASSPHRASE).toBe("Test SDF Network ; September 2015");
      expect(env.ADMIN_SECRET_KEY).toBe("");
      expect(env.LOGIN_RATE_LIMIT_MAX_REQUESTS).toBe(5);
      expect(env.TOKEN_DEPLOY_RATE_LIMIT_MAX_REQUESTS).toBe(10);
    });

    it("should accept custom rate limiting environment values", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
      process.env.LOGIN_RATE_LIMIT_WINDOW_MS = "60000";
      process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS = "9";
      process.env.TOKEN_DEPLOY_RATE_LIMIT_WINDOW_MS = "120000";
      process.env.TOKEN_DEPLOY_RATE_LIMIT_MAX_REQUESTS = "15";

      const env = validateEnv();

      expect(env.LOGIN_RATE_LIMIT_WINDOW_MS).toBe(60000);
      expect(env.LOGIN_RATE_LIMIT_MAX_REQUESTS).toBe(9);
      expect(env.TOKEN_DEPLOY_RATE_LIMIT_WINDOW_MS).toBe(120000);
      expect(env.TOKEN_DEPLOY_RATE_LIMIT_MAX_REQUESTS).toBe(15);
    });

    it("should throw when required environment variables are missing", () => {
      const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
      delete process.env.MONGO_URI;
      delete process.env.JWT_SECRET;
      delete process.env.SOROBAN_RPC_URL;

      validateEnv();

      expect(mockExit).toHaveBeenCalled();
      mockExit.mockRestore();
    });
  });

  describe("initEnv", () => {
    it("should initialize environment and cache the result", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      const env1 = initEnv();
      const env2 = initEnv();

      expect(env1).toBe(env2);
    });

    it("should exit the process when validation fails", () => {
      const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
      const mockError = jest.spyOn(console, "error").mockImplementation(() => {});

      delete process.env.MONGO_URI;
      delete process.env.JWT_SECRET;
      delete process.env.SOROBAN_RPC_URL;

      jest.resetModules();
      const { initEnv: freshInitEnv } = require("../../config/env-config");

      freshInitEnv();

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockError).toHaveBeenCalled();

      mockExit.mockRestore();
      mockError.mockRestore();
    });
  });

  describe("getEnv", () => {
    it("should initialize environment if not already cached", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      jest.resetModules();
      const { getEnv: freshGetEnv } = require("../../config/env-config");

      const env = freshGetEnv();

      expect(env.MONGO_URI).toBe("mongodb://localhost:27017/soromint");
      expect(env.JWT_SECRET).toBe("test-secret-key");
    });
  });
});

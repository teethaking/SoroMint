/**
 * @title Environment Configuration Tests
 * @description Test suite for environment variable validation
 * @notice Ensures fail-fast validation works correctly
 */

const { validateEnv, initEnv, getEnv } = require("../../config/env-config");

describe("Environment Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    // Clear the validatedEnv cache
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("validateEnv", () => {
    it("should validate all required environment variables successfully", () => {
      // Set all required variables
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
      expect(env.NODE_ENV).toBe("development");
      expect(env.JWT_EXPIRES_IN).toBe("24h");
      expect(env.NETWORK_PASSPHRASE).toBe("Test SDF Network ; September 2015");
      expect(env.ADMIN_SECRET_KEY).toBe("");
    });

    it("should throw error when MONGO_URI is missing", () => {
      delete process.env.MONGO_URI;
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      expect(() => validateEnv()).toThrow();
    });

    it("should throw error when JWT_SECRET is missing", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      delete process.env.JWT_SECRET;
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      expect(() => validateEnv()).toThrow();
    });

    it("should throw error when SOROBAN_RPC_URL is missing", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      delete process.env.SOROBAN_RPC_URL;

      expect(() => validateEnv()).toThrow();
    });

    it("should throw error when MONGO_URI is not a valid URL", () => {
      process.env.MONGO_URI = "not-a-valid-url";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      expect(() => validateEnv()).toThrow("Invalid url");
    });

    it("should throw error when SOROBAN_RPC_URL is not a valid URL", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "invalid-url";

      expect(() => validateEnv()).toThrow("Invalid url");
    });

    it("should accept custom PORT value", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
      process.env.PORT = "3000";

      const env = validateEnv();

      expect(env.PORT).toBe(3000);
    });

    it("should accept valid NODE_ENV values", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      const validEnvs = ["development", "production", "test"];

      validEnvs.forEach((nodeEnv) => {
        process.env.NODE_ENV = nodeEnv;
        const env = validateEnv();
        expect(env.NODE_ENV).toBe(nodeEnv);
      });
    });

    it("should throw error for invalid NODE_ENV value", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
      process.env.NODE_ENV = "invalid-env";

      expect(() => validateEnv()).toThrow();
    });

    it("should handle MongoDB URI with authentication", () => {
      process.env.MONGO_URI = "mongodb://user:password@localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      const env = validateEnv();

      expect(env.MONGO_URI).toBe("mongodb://user:password@localhost:27017/soromint");
    });

    it("should handle custom JWT_EXPIRES_IN", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
      process.env.JWT_EXPIRES_IN = "7d";

      const env = validateEnv();

      expect(env.JWT_EXPIRES_IN).toBe("7d");
    });

    it("should handle custom NETWORK_PASSPHRASE", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
      process.env.NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015";

      const env = validateEnv();

      expect(env.NETWORK_PASSPHRASE).toBe("Public Global Stellar Network ; September 2015");
    });

    it("should handle ADMIN_SECRET_KEY when provided", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
      process.env.ADMIN_SECRET_KEY = "SABC123...";

      const env = validateEnv();

      expect(env.ADMIN_SECRET_KEY).toBe("SABC123...");
    });
  });

  describe("initEnv", () => {
    it("should initialize environment and cache the result", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      const env1 = initEnv();
      const env2 = initEnv();

      expect(env1).toBe(env2); // Same reference (cached)
    });

    it("should exit process when validation fails", () => {
      const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
      const mockError = jest.spyOn(console, "error").mockImplementation(() => {});

      delete process.env.MONGO_URI;
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      // Reset modules to clear cache
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
    it("should return cached environment if already initialized", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      const env1 = initEnv();
      const env2 = getEnv();

      expect(env1).toBe(env2);
    });

    it("should initialize environment if not already cached", () => {
      process.env.MONGO_URI = "mongodb://localhost:27017/soromint";
      process.env.JWT_SECRET = "test-secret-key";
      process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

      // Reset modules to clear cache
      jest.resetModules();
      const { getEnv: freshGetEnv } = require("../../config/env-config");

      const env = freshGetEnv();

      expect(env.MONGO_URI).toBe("mongodb://localhost:27017/soromint");
      expect(env.JWT_SECRET).toBe("test-secret-key");
    });
  });
});

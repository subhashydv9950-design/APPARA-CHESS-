/* =========================================================
   APPARA CHESS — TEST UTILITIES
   FILE: tests/test-utils.js
   PART: 1 OF 2

   PURPOSE:
   - Browser-based testing framework
   - Test registration
   - Assertions
   - Error reporting
   ========================================================= */

export const TestRegistry = {
  suites: [],
  results: [],
  running: false,

  register(name, callback) {
    if (typeof name !== "string" || !name.trim()) {
      throw new TypeError("Test suite name is required.");
    }

    if (typeof callback !== "function") {
      throw new TypeError("Test suite callback is required.");
    }

    this.suites.push({
      name: name.trim(),
      callback
    });

    return this.suites.length;
  },

  clear() {
    this.suites = [];
    this.results = [];
    this.running = false;
  },

  getSummary() {
    const passed = this.results.filter(
      result => result.status === "passed"
    ).length;

    const failed = this.results.filter(
      result => result.status === "failed"
    ).length;

    return {
      total: this.results.length,
      passed,
      failed,
      success: failed === 0
    };
  }
};

export const Assert = Object.freeze({
  true(value, message = "Expected value to be true.") {
    if (value !== true) {
      throw new Error(message);
    }
  },

  false(value, message = "Expected value to be false.") {
    if (value !== false) {
      throw new Error(message);
    }
  },

  equal(actual, expected, message = "") {
    if (actual !== expected) {
      throw new Error(
        message ||
        `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`
      );
    }
  },

  notEqual(actual, expected, message = "") {
    if (actual === expected) {
      throw new Error(
        message ||
        `Expected values to be different: ${JSON.stringify(actual)}.`
      );
    }
  },

  deepEqual(actual, expected, message = "") {
    const actualJSON = JSON.stringify(actual);
    const expectedJSON = JSON.stringify(expected);

    if (actualJSON !== expectedJSON) {
      throw new Error(
        message ||
        `Expected ${expectedJSON}, received ${actualJSON}.`
      );
    }
  },

  exists(value, message = "Expected value to exist.") {
    if (value === null || value === undefined) {
      throw new Error(message);
    }
  },

  isNull(value, message = "Expected value to be null.") {
    if (value !== null) {
      throw new Error(message);
    }
  },

  throws(callback, message = "Expected function to throw.") {
    if (typeof callback !== "function") {
      throw new TypeError("Assert.throws requires a function.");
    }

    let didThrow = false;

    try {
      callback();
    } catch {
      didThrow = true;
    }

    if (!didThrow) {
      throw new Error(message);
    }
  },

  async rejects(callback, message = "Expected promise to reject.") {
    if (typeof callback !== "function") {
      throw new TypeError("Assert.rejects requires a function.");
    }

    let didReject = false;

    try {
      await callback();
    } catch {
      didReject = true;
    }

    if (!didReject) {
      throw new Error(message);
    }
  },

  includes(collection, value, message = "Expected collection to include value.") {
    if (
      collection === null ||
      collection === undefined ||
      typeof collection.includes !== "function" ||
      !collection.includes(value)
    ) {
      throw new Error(message);
    }
  },

  greaterThan(actual, expected, message = "") {
    if (!(actual > expected)) {
      throw new Error(
        message ||
        `Expected ${actual} to be greater than ${expected}.`
      );
    }
  },

  lessThan(actual, expected, message = "") {
    if (!(actual < expected)) {
      throw new Error(
        message ||
        `Expected ${actual} to be less than ${expected}.`
      );
    }
  }
};

export function test(name, callback) {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError("Test name is required.");
  }

  if (typeof callback !== "function") {
    throw new TypeError("Test callback is required.");
  }

  return {
    name: name.trim(),
    callback
  };
}

/* =========================================================
   FILE: tests/test-utils.js
   PART 1 COMPLETE — FILE NOT COMPLETE YET
   NEXT: PART 2
   ========================================================= */
/* =========================================================
   APPARA CHESS — TEST UTILITIES
   FILE: tests/test-utils.js
   PART: 2 OF 2
   ========================================================= */

/**
 * Creates a test suite.
 *
 * Example:
 * createTestSuite("Chess Engine", [
 *   test("Engine initializes", () => {
 *     Assert.exists(engine);
 *   })
 * ]);
 */
export function createTestSuite(name, tests = []) {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError("Test suite name is required.");
  }

  if (!Array.isArray(tests)) {
    throw new TypeError("Test cases must be an array.");
  }

  return {
    name: name.trim(),
    tests
  };
}

/**
 * Executes one test case.
 */
export async function runSingleTest(suiteName, testCase) {
  const startedAt = Date.now();

  const result = {
    suite: suiteName,
    name: testCase?.name || "Unnamed test",
    status: "pending",
    duration: 0,
    error: null
  };

  try {
    if (typeof testCase?.callback !== "function") {
      throw new TypeError("Test callback is missing.");
    }

    await testCase.callback();

    result.status = "passed";
  } catch (error) {
    result.status = "failed";
    result.error = {
      name: error?.name || "Error",
      message: error?.message || String(error),
      stack: error?.stack || ""
    };
  }

  result.duration = Date.now() - startedAt;

  TestRegistry.results.push(result);

  return result;
}

/**
 * Executes all tests inside one suite.
 */
export async function runTestSuite(
  suiteName,
  tests,
  options = {}
) {
  if (!Array.isArray(tests)) {
    throw new TypeError("Test cases must be an array.");
  }

  const suiteResults = [];

  for (const testCase of tests) {
    const result = await runSingleTest(
      suiteName,
      testCase
    );

    suiteResults.push(result);

    if (typeof options.onResult === "function") {
      try {
        options.onResult(result);
      } catch (error) {
        console.error("Test result callback error:", error);
      }
    }
  }

  return suiteResults;
}

/**
 * Executes every registered suite.
 *
 * Each registered callback must return an array of test cases.
 *
 * Example:
 *
 * TestRegistry.register("Basic Tests", () => [
 *   test("Example test", () => {
 *     Assert.equal(2 + 2, 4);
 *   })
 * ]);
 */
export async function runAllTests(options = {}) {
  if (TestRegistry.running) {
    throw new Error("Tests are already running.");
  }

  TestRegistry.running = true;
  TestRegistry.results = [];

  const startedAt = Date.now();
  const suiteErrors = [];

  try {
    for (const registeredSuite of TestRegistry.suites) {
      let testCases = [];

      try {
        testCases = await registeredSuite.callback();

        if (!Array.isArray(testCases)) {
          throw new TypeError(
            `Suite "${registeredSuite.name}" must return an array of tests.`
          );
        }
      } catch (error) {
        suiteErrors.push({
          suite: registeredSuite.name,
          message: error?.message || String(error)
        });

        continue;
      }

      await runTestSuite(
        registeredSuite.name,
        testCases,
        options
      );
    }

    const summary = {
      ...TestRegistry.getSummary(),
      suiteCount: TestRegistry.suites.length,
      suiteErrors,
      duration: Date.now() - startedAt
    };

    if (typeof options.onComplete === "function") {
      try {
        options.onComplete(summary);
      } catch (error) {
        console.error("Test completion callback error:", error);
      }
    }

    return summary;
  } finally {
    TestRegistry.running = false;
  }
}

/**
 * Renders test results into a browser container.
 * Uses textContent to avoid inserting HTML from error messages.
 */
export function renderTestResults(
  container,
  results = TestRegistry.results
) {
  if (!container || typeof container.replaceChildren !== "function") {
    throw new TypeError("A valid DOM container is required.");
  }

  const documentRef = container.ownerDocument;

  if (!documentRef) {
    throw new Error("Container document is unavailable.");
  }

  const fragment = documentRef.createDocumentFragment();

  const heading = documentRef.createElement("h2");
  heading.textContent = "APPARA CHESS — Test Results";
  fragment.appendChild(heading);

  const summary = documentRef.createElement("p");

  const passed = results.filter(
    item => item.status === "passed"
  ).length;

  const failed = results.filter(
    item => item.status === "failed"
  ).length;

  summary.textContent =
    `Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`;

  fragment.appendChild(summary);

  for (const result of results) {
    const item = documentRef.createElement("div");
    item.className = `test-result test-${result.status}`;

    const title = documentRef.createElement("strong");
    title.textContent =
      `${result.status.toUpperCase()} — ${result.suite}: ${result.name}`;

    item.appendChild(title);

    const duration = documentRef.createElement("small");
    duration.textContent = ` (${result.duration} ms)`;
    item.appendChild(duration);

    if (result.error) {
      const errorMessage = documentRef.createElement("p");
      errorMessage.textContent = result.error.message;
      item.appendChild(errorMessage);
    }

    fragment.appendChild(item);
  }

  container.replaceChildren(fragment);

  return {
    total: results.length,
    passed,
    failed
  };
}

/**
 * Removes all registered tests and previous results.
 */
export function resetTestRunner() {
  TestRegistry.clear();
}

/* =========================================================
   FILE: tests/test-utils.js
   PART 2 COMPLETE
   FULL FILE COMPLETE — NEW FILE 3/10
   ========================================================= */

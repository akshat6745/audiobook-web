import "@testing-library/jest-dom";

/**
 * The axios instance in api.ts installs its interceptors at module load, so
 * each test imports the module fresh after setting up localStorage.
 */

const loadApi = () => {
  let api: any;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    api = require("../api").default;
  });
  return api;
};

const runRequestInterceptors = async (api: any, config: any = { headers: {} }) => {
  const handlers = api.interceptors.request.handlers.filter(Boolean);
  let result = config;
  for (const h of handlers) {
    result = await h.fulfilled(result);
  }
  return result;
};

const runResponseError = async (api: any, error: any) => {
  const handlers = api.interceptors.response.handlers.filter(Boolean);
  for (const h of handlers) {
    if (h.rejected) {
      try {
        await h.rejected(error);
      } catch (thrown) {
        return thrown;
      }
    }
  }
  return undefined;
};

beforeEach(() => {
  localStorage.clear();
  jest.resetModules();
});

describe("request interceptor", () => {
  it("attaches the bearer token when signed in", async () => {
    localStorage.setItem("audiobook_access_token", "jwt-abc");
    const api = loadApi();

    const config = await runRequestInterceptors(api);

    expect(config.headers.Authorization).toBe("Bearer jwt-abc");
  });

  it("sends no Authorization header when signed out", async () => {
    const api = loadApi();

    const config = await runRequestInterceptors(api);

    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe("response interceptor", () => {
  it("clears the session on 401", async () => {
    localStorage.setItem("audiobook_access_token", "expired");
    localStorage.setItem("audiobook_username", "Akshat");
    const api = loadApi();

    await runResponseError(api, {
      response: { status: 401, data: { detail: "Not authenticated" } },
    });

    // A rejected token must not linger — otherwise every later request
    // retries with a credential the backend has already refused.
    expect(localStorage.getItem("audiobook_access_token")).toBeNull();
    expect(localStorage.getItem("audiobook_username")).toBeNull();
  });

  it("leaves the session alone on other errors", async () => {
    localStorage.setItem("audiobook_access_token", "still-good");
    localStorage.setItem("audiobook_username", "Akshat");
    const api = loadApi();

    for (const status of [400, 403, 404, 500, 503]) {
      await runResponseError(api, { response: { status, data: {} } });
    }

    // A server error is not a reason to sign the user out.
    expect(localStorage.getItem("audiobook_access_token")).toBe("still-good");
  });

  it("surfaces the backend's detail message", async () => {
    const api = loadApi();

    const thrown: any = await runResponseError(api, {
      response: { status: 400, data: { detail: "Username already exists" } },
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.message).toBe("Username already exists");
  });
});

import React from "react";
import "@testing-library/jest-dom";
import { render, waitFor } from "@testing-library/react";
import GoogleButton from "../GoogleButton";
import { loadGoogleIdentity } from "../../services/googleIdentity";

jest.mock("../../services/googleIdentity", () => ({
  GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
  loadGoogleIdentity: jest.fn(),
}));

const mockLoad = loadGoogleIdentity as jest.MockedFunction<typeof loadGoogleIdentity>;

/** A fake of the Google Identity Services `accounts.id` API. */
const fakeGoogle = () => {
  let callback: (r: { credential?: string }) => void = () => {};
  const api = {
    initialize: jest.fn((config: any) => {
      callback = config.callback;
    }),
    renderButton: jest.fn(),
    disableAutoSelect: jest.fn(),
  };
  return { api, respond: (r: { credential?: string }) => callback(r) };
};

beforeEach(() => jest.clearAllMocks());

describe("GoogleButton", () => {
  it("initialises GIS with the Web client ID and renders Google's button", async () => {
    const { api } = fakeGoogle();
    mockLoad.mockResolvedValue(api);

    render(<GoogleButton onCredential={jest.fn()} />);

    await waitFor(() => expect(api.renderButton).toHaveBeenCalled());
    expect(api.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: "test-client.apps.googleusercontent.com",
        // Never silently sign someone in as the last-used account.
        auto_select: false,
      })
    );
  });

  it("passes the ID token on once the user picks an account", async () => {
    const { api, respond } = fakeGoogle();
    mockLoad.mockResolvedValue(api);
    const onCredential = jest.fn();

    render(<GoogleButton onCredential={onCredential} />);
    await waitFor(() => expect(api.initialize).toHaveBeenCalled());

    respond({ credential: "google-id-token" });

    expect(onCredential).toHaveBeenCalledWith("google-id-token");
  });

  it("ignores a response with no credential", async () => {
    const { api, respond } = fakeGoogle();
    mockLoad.mockResolvedValue(api);
    const onCredential = jest.fn();

    render(<GoogleButton onCredential={onCredential} />);
    await waitFor(() => expect(api.initialize).toHaveBeenCalled());

    respond({});

    expect(onCredential).not.toHaveBeenCalled();
  });

  it("says so when Google's script can't be loaded", async () => {
    mockLoad.mockRejectedValue(new Error("blocked"));

    const { findByText } = render(<GoogleButton onCredential={jest.fn()} />);

    expect(await findByText(/unavailable right now/i)).toBeInTheDocument();
  });
});

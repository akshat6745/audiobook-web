import "@testing-library/jest-dom";
import {
  STORAGE_KEYS,
  clearUserSession,
  getCurrentUsername,
  getToken,
  setSession,
} from "../config";

beforeEach(() => {
  localStorage.clear();
});

describe("session storage", () => {
  it("stores the username and token together", () => {
    setSession("Akshat", "jwt-abc");

    expect(getCurrentUsername()).toBe("Akshat");
    expect(getToken()).toBe("jwt-abc");
  });

  it("treats a username with no token as signed out", () => {
    // The dangerous half-state: something looks signed in but can't
    // authorise anything. Identity rests on the token.
    localStorage.setItem(STORAGE_KEYS.USERNAME, "Akshat");

    expect(getCurrentUsername()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("reports signed out when nothing is stored", () => {
    expect(getCurrentUsername()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("clears both halves on sign-out", () => {
    setSession("Akshat", "jwt-abc");

    clearUserSession();

    expect(getCurrentUsername()).toBeNull();
    expect(getToken()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.USERNAME)).toBeNull();
  });

  it("no longer keeps a separate client-side expiry", () => {
    // A second 30-day clock alongside the token's own `exp` would drift,
    // leaving the UI confident while the backend rejected every call.
    setSession("Akshat", "jwt-abc");

    const keys = Object.keys(localStorage);
    expect(keys).not.toContain("audiobook_login_expiry");
  });
});

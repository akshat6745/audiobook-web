import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../LoginPage";
import { googleSignIn, loginUser, registerUser } from "../../services/api";
import { getCurrentUsername, setSession } from "../../utils/config";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../services/api", () => ({
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  googleSignIn: jest.fn(),
}));

// Stand-in for Google's rendered button: clicking it delivers an ID token,
// as Google Identity Services does once the user picks an account.
jest.mock("../../components/GoogleButton", () => ({
  __esModule: true,
  default: ({ onCredential }: { onCredential: (t: string) => void }) => (
    <button type="button" onClick={() => onCredential("google-id-token")}>
      Mock Google
    </button>
  ),
}));

jest.mock("../../utils/config", () => ({
  getCurrentUsername: jest.fn(),
  setSession: jest.fn(),
}));

const mockLoginUser = loginUser as jest.MockedFunction<typeof loginUser>;
const mockRegisterUser = registerUser as jest.MockedFunction<typeof registerUser>;
const mockGoogleSignIn = googleSignIn as jest.MockedFunction<typeof googleSignIn>;
const mockGetCurrentUsername = getCurrentUsername as jest.MockedFunction<
  typeof getCurrentUsername
>;
const mockSetSession = setSession as jest.MockedFunction<typeof setSession>;

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

async function submitCredentials(username: string, password: string) {
  await userEvent.type(screen.getByPlaceholderText("Enter your username"), username);
  await userEvent.type(screen.getByPlaceholderText("Enter your password"), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
  // Nobody signed in, so the page doesn't redirect on mount.
  mockGetCurrentUsername.mockReturnValue(null);
});

describe("LoginPage sign-in", () => {
  it("signs the user in when the backend accepts the credentials", async () => {
    mockLoginUser.mockResolvedValue({
      status: "success",
      username: "Akshat",
      access_token: "jwt-token-abc",
    } as any);
    renderLogin();

    await submitCredentials("Akshat", "correct-password");

    await waitFor(() =>
      expect(mockSetSession).toHaveBeenCalledWith("Akshat", "jwt-token-abc")
    );
    expect(mockNavigate).toHaveBeenCalledWith("/novels");
  });

  it("does NOT sign in when the backend rejects the password", async () => {
    // Regression guard: this used to be swallowed and treated as a
    // successful "mock" login, so any password got into any account.
    mockLoginUser.mockRejectedValue(new Error("Invalid username or password"));
    renderLogin();

    await submitCredentials("Akshat", "gibberish");

    await waitFor(() =>
      expect(screen.getByText("Invalid username or password")).toBeInTheDocument()
    );
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does NOT sign in when the backend is unreachable", async () => {
    // An unavailable API must fail closed, not fall back to a fake session.
    mockLoginUser.mockRejectedValue(new Error("Network Error"));
    renderLogin();

    await submitCredentials("Akshat", "gibberish");

    await waitFor(() => expect(screen.getByText("Network Error")).toBeInTheDocument());
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does NOT sign in when the response carries no access token", async () => {
    // A 200 without a token is not a session — identity rests on the token,
    // so storing just the username would look signed in while every
    // subsequent request got rejected.
    mockLoginUser.mockResolvedValue({ status: "success" } as any);
    renderLogin();

    await submitCredentials("Akshat", "correct-password");

    await waitFor(() =>
      expect(screen.getByText(/sign in failed/i)).toBeInTheDocument()
    );
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("requires both fields before calling the backend", async () => {
    renderLogin();

    await userEvent.type(screen.getByPlaceholderText("Enter your username"), "Akshat");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockLoginUser).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});

describe("LoginPage registration", () => {
  const switchToRegister = async () => {
    await userEvent.click(
      screen.getByRole("button", { name: /don't have an account/i })
    );
  };

  it("surfaces the error and stays on the form when registration fails", async () => {
    mockRegisterUser.mockRejectedValue(new Error("Username already exists"));
    renderLogin();
    await switchToRegister();

    await userEvent.type(screen.getByPlaceholderText("Enter your username"), "Akshat");
    await userEvent.type(screen.getByPlaceholderText("Enter your password"), "s3cret!");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText("Username already exists")).toBeInTheDocument()
    );
    // A failed registration must never produce a session.
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("returns to the sign-in form after a successful registration", async () => {
    mockRegisterUser.mockResolvedValue({ status: "success" } as any);
    renderLogin();
    await switchToRegister();

    await userEvent.type(screen.getByPlaceholderText("Enter your username"), "newuser");
    await userEvent.type(screen.getByPlaceholderText("Enter your password"), "s3cret!");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    );
    // Registering does not also sign you in.
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});

describe("LoginPage Google sign-in", () => {
  it("signs in as the account the backend resolved", async () => {
    // e.g. a Google identity linked to the existing "Akshat" account
    mockGoogleSignIn.mockResolvedValue({
      status: "success",
      username: "Akshat",
      access_token: "jwt-from-google",
    } as any);
    renderLogin();

    await userEvent.click(screen.getByRole("button", { name: /mock google/i }));

    await waitFor(() =>
      expect(mockSetSession).toHaveBeenCalledWith("Akshat", "jwt-from-google")
    );
    expect(mockGoogleSignIn).toHaveBeenCalledWith("google-id-token");
    expect(mockNavigate).toHaveBeenCalledWith("/novels");
  });

  it("does NOT sign in when the backend rejects the Google token", async () => {
    mockGoogleSignIn.mockRejectedValue(new Error("Could not verify Google sign-in"));
    renderLogin();

    await userEvent.click(screen.getByRole("button", { name: /mock google/i }));

    await waitFor(() =>
      expect(screen.getByText("Could not verify Google sign-in")).toBeInTheDocument()
    );
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does NOT sign in when the response carries no access token", async () => {
    mockGoogleSignIn.mockResolvedValue({ status: "success", username: "Akshat" } as any);
    renderLogin();

    await userEvent.click(screen.getByRole("button", { name: /mock google/i }));

    await waitFor(() =>
      expect(screen.getByText(/couldn't sign in with google/i)).toBeInTheDocument()
    );
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it("is not offered on the registration form", async () => {
    // Google creates or reaches accounts itself; it isn't a registration step.
    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: /don't have an account/i }));

    expect(screen.queryByRole("button", { name: /mock google/i })).not.toBeInTheDocument();
  });
});

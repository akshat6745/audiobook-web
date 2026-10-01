import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LinkGoogleAccount from "../LinkGoogleAccount";
import { linkGoogleAccount } from "../../services/api";

jest.mock("../../services/api", () => ({
  linkGoogleAccount: jest.fn(),
}));

// A configured build, so the component renders.
jest.mock("../../services/googleIdentity", () => ({
  GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
  loadGoogleIdentity: jest.fn(),
  forgetGoogleSelection: jest.fn(),
}));

// Clicking stands in for picking an account in Google's own button.
jest.mock("../GoogleButton", () => ({
  __esModule: true,
  default: ({ onCredential }: { onCredential: (t: string) => void }) => (
    <button type="button" onClick={() => onCredential("google-id-token")}>
      Mock Google
    </button>
  ),
}));

const mockLink = linkGoogleAccount as jest.MockedFunction<typeof linkGoogleAccount>;

const openAndPick = async () => {
  render(<LinkGoogleAccount />);
  await userEvent.click(screen.getByRole("button", { name: /link google/i }));
  await userEvent.click(screen.getByRole("button", { name: /mock google/i }));
};

beforeEach(() => jest.clearAllMocks());

describe("LinkGoogleAccount", () => {
  it("links and confirms which Google account", async () => {
    mockLink.mockResolvedValue({ status: "success", linked: true, email: "me@gmail.com" });

    await openAndPick();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Linked me@gmail.com")
    );
    expect(mockLink).toHaveBeenCalledWith("google-id-token");
    // Once linked there is nothing more to click.
    expect(screen.queryByRole("button", { name: /mock google/i })).not.toBeInTheDocument();
  });

  it("shows the backend's reason when the link is refused", async () => {
    mockLink.mockRejectedValue(
      new Error("That Google account is already linked to another account")
    );

    await openAndPick();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "That Google account is already linked to another account"
      )
    );
    // Lets the user retry with a different Google account.
    expect(screen.getByRole("button", { name: /mock google/i })).toBeInTheDocument();
  });

  it("treats a response without linked=true as a failure", async () => {
    mockLink.mockResolvedValue({ status: "success" } as any);

    await openAndPick();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/couldn't link/i)
    );
  });

  it("closes without calling the backend when cancelled", async () => {
    render(<LinkGoogleAccount />);
    await userEvent.click(screen.getByRole("button", { name: /link google/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockLink).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateJobForm } from "../components/CreateJobForm";
import { WalletButton } from "../components/WalletButton";
import * as useWalletHook from "../hooks/useWallet";

// Mock the wallet hook
vi.mock("../hooks/useWallet", () => ({
  useWallet: vi.fn(),
}));

describe("SkillEscrow Frontend Unit Tests", () => {
  
  // Test Case 1: Component Render
  it("renders the CreateJobForm inputs and button correctly", () => {
    render(
      <CreateJobForm
        onSubmit={vi.fn()}
        isSubmitting={false}
        walletConnected={true}
      />
    );

    expect(screen.getByText("Post a New Gig")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. GB44L2MS...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. CDWS...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 150")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Job Listing" })).toBeInTheDocument();
  });

  // Test Case 2: Form Validation Case
  it("shows validation error when entering an invalid freelancer address", async () => {
    render(
      <CreateJobForm
        onSubmit={vi.fn()}
        isSubmitting={false}
        walletConnected={true}
      />
    );

    const freelancerInput = screen.getByPlaceholderText("e.g. GB44L2MS...");
    const submitButton = screen.getByRole("button", { name: "Create Job Listing" });

    // Type an invalid address
    fireEvent.change(freelancerInput, { target: { value: "invalid-address" } });
    fireEvent.click(submitButton);

    // Wait for the validation message to appear
    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid Stellar freelancer public key (starting with G).")
      ).toBeInTheDocument();
    });
  });

  // Test Case 3: Mocked Wallet Connect Success Case
  it("displays the connect button and handles wallet connect callback", async () => {
    const mockConnect = vi.fn();
    
    // Mock the useWallet hook return value for unconnected state
    vi.mocked(useWalletHook.useWallet).mockReturnValue({
      address: null,
      isConnecting: false,
      isInstalled: true,
      error: null,
      connect: mockConnect,
      disconnect: vi.fn(),
      sign: vi.fn(),
    });

    render(<WalletButton />);

    const connectButton = screen.getByRole("button", { name: "Connect wallet" });
    expect(connectButton).toBeInTheDocument();

    // Click connect and verify it triggers mockConnect
    fireEvent.click(connectButton);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });
});

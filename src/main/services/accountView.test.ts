const mockReconnect = jest.fn();
let mockActiveEmail = "first@example.test";
const mockSetActive = jest.fn((email: string) => { mockActiveEmail = email; });
const mockSend = jest.fn();
jest.mock("electron", () => ({
  app: { getPath: () => "/tmp/account-view-test" },
  BrowserWindow: { getAllWindows: () => [{ webContents: { send: mockSend } }] },
}));
jest.mock("fs", () => ({ existsSync: () => true }));
jest.mock("../db", () => ({ reconnectDb: mockReconnect }));
jest.mock("../credentials", () => ({
  getActiveEmail: () => mockActiveEmail,
  setActiveEmail: mockSetActive,
  listAccounts: () => [{ email: "first@example.test" }, { email: "second@example.test" }],
  emailToFileKey: (email: string) => email.split("@")[0],
}));
import { switchToAccount } from "./accountView";

beforeEach(() => { mockActiveEmail = "first@example.test"; jest.clearAllMocks(); });

it("switches the open mailbox and the sync account together", () => {
  switchToAccount("second@example.test");
  expect(mockReconnect).toHaveBeenCalledWith("/tmp/account-view-test/second.db");
  expect(mockSetActive).toHaveBeenCalledWith("second@example.test");
  expect(mockActiveEmail).toBe("second@example.test");
  expect(mockSend).toHaveBeenCalledWith("account-switched", "second@example.test");
});

it("restores the previous database if opening the next account fails", () => {
  mockReconnect.mockImplementationOnce(() => { throw new Error("Unavailable"); });
  expect(() => switchToAccount("second@example.test")).toThrow("Unavailable");
  expect(mockReconnect).toHaveBeenLastCalledWith("/tmp/account-view-test/first.db");
  expect(mockSetActive).not.toHaveBeenCalled();
  expect(mockActiveEmail).toBe("first@example.test");
});

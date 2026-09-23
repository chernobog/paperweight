import { app, BrowserWindow } from "electron";
import { existsSync } from "fs";
import { join } from "path";
import { IPC } from "@shared/ipc";
import { emailToFileKey, getActiveEmail, listAccounts, setActiveEmail } from "../credentials";
import { reconnectDb } from "../db";

export function switchToAccount(email: string): void {
  if (!listAccounts().some((account) => account.email === email)) {
    throw new Error("Account not found");
  }
  const nextPath = join(app.getPath("userData"), `${emailToFileKey(email)}.db`);
  if (!existsSync(nextPath)) throw new Error("This account's saved data is unavailable.");
  const previousEmail = getActiveEmail();
  try {
    reconnectDb(nextPath);
  } catch (error) {
    if (previousEmail) {
      reconnectDb(join(app.getPath("userData"), `${emailToFileKey(previousEmail)}.db`));
    }
    throw error;
  }
  if (email !== previousEmail) setActiveEmail(email);
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.accountSwitched, email);
  }
}

import { config } from "../../config.js";

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

// Development only: prints the OTP in the server log instead of sending an SMS.
export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string) {
    console.log(`[dev OTP] ${phone}: ${code}`);
  }
}

export function createSmsProvider(): SmsProvider {
  if (config.OTP_PROVIDER === "console") return new ConsoleSmsProvider();
  // TODO: implement MSG91 once DLT registration and templates are approved.
  throw new Error("OTP_PROVIDER=msg91 is not implemented yet");
}

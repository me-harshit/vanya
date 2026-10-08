import { createApp } from "./app.js";
import { config } from "./config.js";
import { connectDb, disconnectDb } from "./db.js";
import { createSmsProvider } from "./modules/auth/sms.js";
import { createBookingService } from "./modules/bookings/bookings.service.js";
import { createGateway } from "./modules/payments/gateway.js";
import { startHoldSweeper } from "./modules/trips/seatHold.js";

async function main() {
  await connectDb();
  console.log("Connected to MongoDB");

  const gateway = createGateway();
  const bookings = createBookingService(gateway);
  console.log(`Payment gateway: ${gateway.name}`);

  startHoldSweeper(); // frees seats whose hold has run out
  bookings.startReconciler(); // finishes interrupted payments, refunds and expiries

  const app = createApp({ sms: createSmsProvider(), bookings });
  const server = app.listen(config.PORT, () => {
    console.log(`API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});

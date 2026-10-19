// Prints the address a phone or another computer on the same Wi-Fi should
// open, before `next dev` starts. Next.js only echoes the bind address
// ("Network: http://0.0.0.0:3000"), which is "every interface", not a URL
// anyone can type. Same detection the backend's server.js banner uses.
import os from "node:os";

const port = process.env.PORT || 3000;

const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((iface) => iface && iface.family === "IPv4" && !iface.internal)
  .map((iface) => iface.address);

if (addresses.length === 0) {
  console.log("  Phone/LAN: no network interface detected");
} else {
  for (const address of addresses) {
    console.log(`  Open on your phone (same Wi-Fi): http://${address}:${port}`);
  }
}

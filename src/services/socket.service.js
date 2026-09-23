import { io } from "socket.io-client";

import { getSocketOrigin } from "@/lib/apiOrigin";

class SocketService {
  socket = null;

  connect(token) {
    if (this.socket) return this.socket;

    const socketUrl = getSocketOrigin();
    this.socket = io(
      socketUrl,
      {
        auth: {
          token,
        },
      }
    );

    this.socket.on("connect_error", (err) => {
      console.warn("[socket] connection failed:", err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (!this.socket) return;

    this.socket.disconnect();
    this.socket = null;
  }

  on(event, callback) {
    this.socket?.on(event, callback);
  }

  off(event, callback) {
    this.socket?.off(event, callback);
  }

  emit(event, payload) {
    this.socket?.emit(event, payload);
  }
}

const socketService = new SocketService();

export default socketService;
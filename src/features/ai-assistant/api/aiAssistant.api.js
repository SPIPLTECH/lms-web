import Cookies from "js-cookie";
import api from "@/lib/axios";

/**
 * The only place the AI Assistant talks to the network.
 *
 * CRUD goes through the shared axios instance (so the auth header and the
 * refresh-token interceptor apply). Streaming cannot: axios has no browser
 * streaming support, so the SSE calls use fetch + ReadableStream directly and
 * attach the same bearer token by hand. Both still live in this layer — no
 * component or page ever calls the network itself.
 */

const baseUrl = () => process.env.NEXT_PUBLIC_API_URL || "";

/* ------------------------------ conversations ------------------------------ */

export const createConversation = async ({ title, courseId } = {}) => {
  const { data } = await api.post("/ai-assistant/conversations", { title, courseId });
  return data.data;
};

export const getConversations = async ({ courseId } = {}) => {
  const { data } = await api.get("/ai-assistant/conversations", {
    params: courseId ? { courseId } : undefined,
  });
  return data.data ?? [];
};

export const getMessages = async (conversationId) => {
  if (!conversationId) return [];
  const { data } = await api.get(`/ai-assistant/conversations/${conversationId}/messages`);
  return data.data ?? [];
};

export const updateConversation = async (conversationId, payload) => {
  const { data } = await api.patch(`/ai-assistant/conversations/${conversationId}`, payload);
  return data.data;
};

export const deleteConversation = async (conversationId) => {
  const { data } = await api.delete(`/ai-assistant/conversations/${conversationId}`);
  return data.data;
};

/* --------------------------------- streaming -------------------------------- */

/**
 * Reads an SSE body and dispatches frames.
 *
 * The server writes `data: {...}\n\n`, so frames are split on the blank line.
 * A partial frame at the end of a network chunk stays in the buffer until the
 * rest arrives — splitting naively on newline would corrupt long tokens.
 */
const consumeSseStream = async (response, { onChunk }) => {
  if (!response.ok || !response.body) {
    let message = "The assistant is unavailable right now. Please try again.";
    try {
      const err = await response.json();
      if (err?.message) message = err.message;
    } catch {
      // Non-JSON error body (a proxy error page, say) — keep the safe default.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const line = raw.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;

      let payload;
      try {
        payload = JSON.parse(line.slice(5).trim());
      } catch {
        continue; // Ignore an unparseable frame rather than killing the stream.
      }

      if (payload.type === "chunk") {
        onChunk?.(payload.content);
      } else if (payload.type === "done") {
        return payload.result;
      } else if (payload.type === "error") {
        const error = new Error(payload.message || "The assistant could not answer. Please try again.");
        error.code = payload.code;
        error.requestId = payload.requestId;
        throw error;
      }
    }
  }

  return null;
};

/**
 * Authenticated streamed turn.
 *
 * `position` carries only ids — courseId / moduleId / lessonId / topicId /
 * contentIds. Never lesson text: the backend refetches everything by id, so
 * client-supplied content could not become grounding even if it were sent.
 * Quiz and assignment ids are deliberately not part of this payload.
 */
export const streamConversationMessage = async ({
  conversationId,
  message,
  position = {},
  onChunk,
  signal,
}) => {
  const token = Cookies.get("accessToken");
  const { courseId, moduleId, lessonId, topicId, contentIds } = position;

  const response = await fetch(
    `${baseUrl()}/ai-assistant/conversations/${conversationId}/messages/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, courseId, moduleId, lessonId, topicId, contentIds }),
      signal,
    }
  );

  return consumeSseStream(response, { onChunk });
};

/**
 * Guest streamed turn — stateless, so there is no conversation id and nothing
 * is persisted server-side. Sent without an Authorization header on purpose:
 * this endpoint uses optionalToken, and the backend decides the scope.
 */
export const streamGuestMessage = async ({ message, courseId, onChunk, signal }) => {
  const response = await fetch(`${baseUrl()}/ai-assistant/guest/messages/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, courseId }),
    signal,
  });

  return consumeSseStream(response, { onChunk });
};

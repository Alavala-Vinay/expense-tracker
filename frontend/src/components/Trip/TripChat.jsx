import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";
import { postMessage } from "../../services/tripService";

export default function TripChat({ tripId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connecting, setConnecting] = useState(true);
  const socketRef = useRef(null);
  const endRef = useRef(null);

  const token = useMemo(() => localStorage.getItem("token"), []);
  const apiBase = useMemo(() =>  "https://backend-2-qwn9.onrender.com", []);

  const currentUserId = useMemo(() => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id || payload._id;
    } catch {
      return null;
    }
  }, [token]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch chat history
  const loadHistory = async () => {
    try {
      const { data } = await axiosInstance.get(API_PATHS.TRIP.GET_CHAT(tripId));
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load chat:", e);
    }
  };

  // Setup socket
  useEffect(() => {
    if (!tripId) return;

    loadHistory();

    const s = io(apiBase, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = s;

    s.on("connect", () => {
      s.emit("join-trip", tripId);
      setConnecting(false);
    });

    s.on("trip-message", (msg) => {
      // Deduplicate messages
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      s.disconnect();
    };
  }, [tripId, apiBase, token]);

  // Send message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    try {
      await postMessage(tripId, text);
      setInput("");
      // Don't add optimistically, socket will push the new msg
    } catch (e) {
      console.error("Failed to send message:", e.response?.data || e.message);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format date headers
  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const d = msg.createdAt ? new Date(msg.createdAt).toDateString() : "unknown";
    if (!groups[d]) groups[d] = [];
    groups[d].push(msg);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedMessages).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-lg shadow-sm">
      {connecting && (
        <span className="text-xs text-gray-400 px-3 py-1">Connecting…</span>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">No messages yet.</p>
        ) : (
          sortedDates.map((dateKey) => {
            const msgs = groupedMessages[dateKey];
            return (
              <div key={dateKey}>
                {/* Date header */}
                <div className="flex justify-center my-3">
                  <span className="bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded-full shadow-sm">
                    {formatDateHeader(dateKey)}
                  </span>
                </div>

                {/* Messages for that date */}
                {msgs.map((m) => {
                  const isMine =
                    m.user?._id === currentUserId || m.user === currentUserId;
                  const authorName = m.user?.fullName || "Unknown";
                  const time = m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  return (
                    <div
                      key={m._id}
                      className={`flex mb-2 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-lg text-sm shadow ${
                          isMine
                            ? "bg-blue-500 text-white rounded-br-none"
                            : "bg-gray-200 text-gray-800 rounded-bl-none"
                        }`}
                      >
                        {!isMine && (
                          <div className="text-xs font-semibold text-gray-700 mb-0.5">
                            {authorName}
                          </div>
                        )}
                        <div>{m.message}</div>
                        <div className="text-[10px] text-gray-400 mt-1 text-right">
                          {time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 flex items-end gap-2 relative border-t">
        <textarea
          className="flex-1 border rounded-md p-2 text-sm resize-none"
          placeholder="Type a message and press Enter…"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}

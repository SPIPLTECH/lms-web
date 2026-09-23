"use client";

import { useState } from "react";
import { Check, CheckCheck, Pencil, Trash2, Star, Paperclip, Video, Mic } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import useChat from "@/hooks/useChat";
import { deleteMessage, updateMessage, toggleStarMessage } from "@/features/chat/api/chat.api";
import ChatAvatar from "./ChatAvatar";
import { getApiOrigin } from "@/lib/apiOrigin";

export default function ChatMessage({ message }) {
  const { user } = useAuth();
  const { setMessages, setConfirmDialog } = useChat();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || message.content || "");
  
  const currentUserId = user?.id || user?._id;
  const senderId = message.senderId || 
                   message.sender?._id || 
                   message.sender?.id || 
                   (typeof message.sender === "string" ? message.sender : null);

  const isMine = message.sender === "me" || 
                 message.senderId === "me" || 
                 (currentUserId && senderId && senderId === currentUserId);

  const senderName = typeof message.sender === "object"
    ? message.sender?.name
    : message.sender;

  const handleDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Message",
      message: "Are you sure you want to delete this message? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await deleteMessage(message.id);
          setMessages((prev) => prev.filter((m) => m.id !== message.id));
        } catch (err) {
          console.error("Failed to delete message:", err);
        }
      }
    });
  };

  const handleEdit = async () => {
    if (!editText.trim()) return;
    try {
      await updateMessage(message.id, { text: editText.trim() });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, text: editText.trim(), content: editText.trim(), edited: true }
            : m
        )
      );
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  };

  const handleToggleStar = async () => {
    try {
      const response = await toggleStarMessage(message.id);
      const updatedStarred = response.data?.isStarred ?? !message.isStarred;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, isStarred: updatedStarred }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to toggle star message:", err);
    }
  };

  // Get attachments array
  const attachments = message.messageAttachments || message.attachments || [];
  const hasText = !!(message.text || message.content);
  const hasAttachments = attachments.length > 0;
  const isOnlyAttachments = hasAttachments && !hasText;

  // Decide the wrapper bubble classes
  const bubbleClass = isOnlyAttachments
    ? "relative w-full"
    : isMine
      ? "rounded-2xl rounded-tr-none bg-gradient-to-br from-orange-500 via-orange-600 to-pink-600 text-foreground shadow-[0_4px_15px_rgba(249,115,22,0.2)] px-4.5 py-3"
      : "rounded-2xl rounded-tl-none border border-border/80 bg-background/60 backdrop-blur-sm text-foreground shadow-[0_4px_15px_rgba(0,0,0,0.1)] px-4.5 py-3";

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.25,
        ease: "easeOut"
      }}
      className={`mb-4 flex gap-2.5 max-w-[85%] ${
        isMine ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
      }`}
    >
      {/* Sender Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <ChatAvatar
          name={isMine ? (user?.name || "Me") : (senderName || "User")}
          image={isMine ? user?.avatar : (typeof message.sender === "object" ? message.sender?.avatar : null)}
          size="sm"
        />
      </div>

      {/* Message Content Container */}
      <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        {/* Sender Name for incoming messages */}
        {!isMine && senderName && (
          <span className="text-caption text-primary/80 mb-1 ml-1 uppercase">
            {senderName}
          </span>
        )}

        {/* Bubble & Hover Actions Row */}
        <div className="relative flex items-center group">
          
          {/* Action icons on hover for own messages */}
          {isMine && !isEditing && (
            <div className="
              absolute
              left-[-85px]
              flex
              items-center
              gap-1
              opacity-0
              group-hover:opacity-100
              transition-all
              duration-200
              bg-background/90
              border
              border-border/80
              rounded-xl
              p-1
              shadow-md
              z-10
            ">
              <button
                onClick={handleToggleStar}
                className={`transition-colors p-1 ${message.isStarred ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-amber-500"}`}
                title={message.isStarred ? "Unstar message" : "Star message"}
              >
                <Star size={11} className={message.isStarred ? "fill-current" : ""} />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="text-muted-foreground hover:text-primary transition-colors p-1"
                title="Edit message"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={handleDelete}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                title="Delete message"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}

          {/* Action icons on hover for incoming messages */}
          {!isMine && !isEditing && (
            <div className="
              absolute
              right-[-36px]
              flex
              items-center
              opacity-0
              group-hover:opacity-100
              transition-all
              duration-200
              bg-background/90
              border
              border-border/80
              rounded-xl
              p-1
              shadow-md
              z-10
            ">
              <button
                onClick={handleToggleStar}
                className={`transition-colors p-1 ${message.isStarred ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-amber-500"}`}
                title={message.isStarred ? "Unstar message" : "Star message"}
              >
                <Star size={11} className={message.isStarred ? "fill-current" : ""} />
              </button>
            </div>
          )}

          <div className={`${bubbleClass}`}>
            {/* Render Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-col gap-2 w-full max-w-[280px]">
                {attachments.map((att) => {
                  const isImg = att.type === "IMAGE" || att.mimeType?.startsWith("image/");
                  const fileUrlWithBase = att.fileUrl.startsWith("http")
                    ? att.fileUrl
                    : `${getApiOrigin()}${att.fileUrl}`;
                  
                  if (isImg) {
                    return (
                      <div key={att.id} className="relative rounded-2xl overflow-hidden border border-border/40 bg-background/20 max-w-[280px] shadow-lg group/img">
                        <img
                          src={fileUrlWithBase}
                          alt={att.fileName}
                          className="object-cover max-h-64 w-full hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                          onClick={() => window.open(fileUrlWithBase, "_blank")}
                        />
                        {/* Overlay for time and status when only an image */}
                        {isOnlyAttachments && (
                          <div className="absolute bottom-2 right-2 bg-background/70 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 text-caption text-foreground">
                            <span>{message.time}</span>
                            {message.isStarred && <Star size={9} className="fill-current text-amber-400" />}
                            {isMine && (
                              message.read ? (
                                <CheckCheck size={10} className="text-sky-300" />
                              ) : (
                                <Check size={10} className="text-foreground" />
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={att.id} className="flex flex-col gap-1 w-full max-w-[280px]">
                      <a
                        href={fileUrlWithBase}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-xs font-semibold leading-tight ${
                          isMine
                            ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
                            : "border-border bg-background/40 text-foreground hover:bg-background/60"
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isMine ? "bg-primary-foreground/10 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {att.type === "VIDEO" ? (
                            <Video size={16} />
                          ) : att.type === "AUDIO" ? (
                            <Mic size={16} />
                          ) : (
                            <Paperclip size={16} />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-left">{att.fileName}</p>
                          <span className={`text-caption ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {att.size ? `${(att.size / 1024).toFixed(1)} KB` : ""}
                          </span>
                        </div>
                      </a>
                      
                      {/* Document Card time and status below it when only document */}
                      {isOnlyAttachments && (
                        <div className={`flex items-center gap-1.5 text-caption text-muted-foreground mt-0.5 px-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          <span>{message.time}</span>
                          {message.isStarred && <Star size={9} className="fill-current text-amber-500" />}
                          {isMine && (
                            message.read ? (
                              <CheckCheck size={11} className="text-sky-400" />
                            ) : (
                              <Check size={11} className="text-muted-foreground" />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[200px]">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none w-full resize-none leading-relaxed border-b border-primary-foreground/40 pb-1"
                  rows={1}
                  autoFocus
                />
                <div className="flex justify-end gap-1.5 text-caption">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(message.text || message.content || "");
                    }}
                    className="text-primary-foreground hover:bg-primary-foreground/15 bg-primary-foreground/10 px-2 py-1 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    className="text-primary bg-primary-foreground hover:opacity-90 px-2 py-1 rounded-md transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              (message.text || message.content) && (
                <p className="text-sm leading-relaxed break-words font-medium tracking-wide">
                  {message.text || message.content}
                </p>
              )
            )}

            {!isEditing && !isOnlyAttachments && (
              <div
                className={`
                  mt-2
                  flex
                  items-center
                  justify-end
                  gap-1
                  text-caption

                  ${
                    isMine
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }
                `}
              >
                <span className="flex items-center gap-1">
                  <span>
                    {message.time}
                    {(message.edited || message.isEdited) && (
                      <span className="text-[8px] font-normal italic ml-1 opacity-80">(edited)</span>
                    )}
                  </span>
                  {message.isStarred && (
                    <Star
                      size={10}
                      className={`fill-current ${
                        isMine ? "text-primary-foreground/80" : "text-amber-500"
                      }`}
                    />
                  )}
                </span>

                {isMine && (
                  <>
                    {message.read ? (
                      <CheckCheck
                        size={12}
                        className="text-info"
                      />
                    ) : (
                      <Check
                        size={12}
                        className="text-primary-foreground/70"
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
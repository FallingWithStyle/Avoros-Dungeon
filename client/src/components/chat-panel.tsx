import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessageWithUser } from "@shared/schema";

export default function ChatPanel() {
  const { user } = useAuth();
  const { lastMessage, sendMessage } = useWebSocket();
  const [messageInput, setMessageInput] = useState("");

  const { data: messages, isLoading } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat/messages"],
    refetchInterval: 10000, // Refetch every 10 seconds as fallback
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      await apiRequest("POST", "/api/chat/messages", { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setMessageInput("");
    },
  });

  // Listen for WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'chat_message') {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    }
  }, [lastMessage]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    sendMessageMutation.mutate(messageInput);
    
    // Also send via WebSocket for real-time updates
    sendMessage('chat_message', {
      message: messageInput,
      user,
      timestamp: new Date().toISOString(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d`;
    }
  };

  const getDisplayName = (user: any) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Commander';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-game-border">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-comments mr-2"></i>
          Command Chat
        </h3>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center text-slate-400">
              <i className="fas fa-spinner fa-spin"></i> Loading messages...
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((message) => (
              <div key={message.id} className="flex items-start space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.user.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-sponsor text-white text-xs">
                    {getDisplayName(message.user).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-sponsor">
                      {getDisplayName(message.user)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatTimeAgo(message.createdAt!)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{message.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-400 py-8">
              <i className="fas fa-comments text-2xl mb-2"></i>
              <p className="text-sm">No messages yet. Be the first to chat!</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-game-border">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Send message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-game-bg border-game-border text-white placeholder-slate-400"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || !messageInput.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sendMessageMutation.isPending ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-paper-plane"></i>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

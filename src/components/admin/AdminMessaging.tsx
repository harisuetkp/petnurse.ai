import { useState } from "react";
import {
  Send,
  Users,
  User,
  MessageSquare,
  Search,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAdminMessages } from "@/hooks/useAdminMessages";
import type { EnrichedUser } from "@/hooks/useAdminData";
import type { UserPermissions } from "@/hooks/useUserRole";

interface AdminMessagingProps {
  users: EnrichedUser[];
  permissions: UserPermissions;
}

export function AdminMessaging({ users, permissions }: AdminMessagingProps) {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isBroadcast, setIsBroadcast] = useState(false);

  const {
    allMessages,
    loadingAllMessages,
    sendMessage,
    broadcastMessage,
    isSending,
  } = useAdminMessages();

  const filteredUsers = users.filter(
    (user) =>
      !searchQuery ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.user_id));
    }
  };

  const handleSend = () => {
    if (!subject.trim() || !content.trim()) return;

    if (isBroadcast || selectedUsers.length > 1) {
      const targetUsers = isBroadcast
        ? users.map((u) => u.user_id)
        : selectedUsers;
      broadcastMessage({ userIds: targetUsers, subject, content });
    } else if (selectedUsers.length === 1) {
      sendMessage({ recipientId: selectedUsers[0], subject, content });
    }

    setIsComposeOpen(false);
    setSubject("");
    setContent("");
    setSelectedUsers([]);
    setIsBroadcast(false);
  };

  const getRecipientEmail = (recipientId: string) => {
    return users.find((u) => u.user_id === recipientId)?.email || "Unknown User";
  };

  if (!permissions.canSendMessages) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">You don't have permission to send messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">User Messaging</h3>
          <p className="text-sm text-slate-400 mt-1">
            Send announcements and messages to your users
          </p>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Send className="h-4 w-4 mr-2" />
              Compose Message
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Compose Message</DialogTitle>
              <DialogDescription className="text-slate-400">
                Send a message to one or more users
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="select" className="w-full">
              <TabsList className="bg-[hsl(222,47%,11%)] w-full">
                <TabsTrigger
                  value="select"
                  className="flex-1 data-[state=active]:bg-primary"
                >
                  <User className="h-4 w-4 mr-2" />
                  Select Users
                </TabsTrigger>
                <TabsTrigger
                  value="broadcast"
                  className="flex-1 data-[state=active]:bg-primary"
                  onClick={() => setIsBroadcast(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Broadcast All
                </TabsTrigger>
              </TabsList>

              <TabsContent value="select" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                      {selectedUsers.length} user(s) selected
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="text-primary hover:text-primary/80"
                    >
                      {selectedUsers.length === filteredUsers.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>
                  <ScrollArea className="h-48 rounded-lg border border-[hsl(217,33%,22%)]">
                    <div className="p-2 space-y-1">
                      {filteredUsers.map((user) => (
                        <label
                          key={user.user_id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                            selectedUsers.includes(user.user_id)
                              ? "bg-primary/20"
                              : "hover:bg-[hsl(217,33%,22%)]"
                          )}
                        >
                          <Checkbox
                            checked={selectedUsers.includes(user.user_id)}
                            onCheckedChange={() => handleToggleUser(user.user_id)}
                            className="border-slate-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">
                              {user.email || "No email"}
                            </p>
                            {user.is_premium && (
                              <Badge className="bg-primary/20 text-primary text-[10px]">
                                Pro
                              </Badge>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="broadcast" className="mt-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-amber-400 text-sm">
                    <strong>Broadcast Mode:</strong> This message will be sent to all{" "}
                    {users.length} registered users.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-white">Subject</Label>
                <Input
                  placeholder="Message subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Message</Label>
                <Textarea
                  placeholder="Type your message here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  isSending ||
                  !subject.trim() ||
                  !content.trim() ||
                  (!isBroadcast && selectedUsers.length === 0)
                }
                className="bg-primary hover:bg-primary/90"
              >
                {isSending ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send{" "}
                    {isBroadcast
                      ? `to ${users.length} users`
                      : selectedUsers.length > 0
                      ? `to ${selectedUsers.length} user(s)`
                      : ""}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Messages */}
      <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)]">
        <div className="p-3 border-b border-[hsl(217,33%,22%)]">
          <h4 className="text-white font-medium text-sm">Recent Messages</h4>
        </div>
        <ScrollArea className="h-[240px]">
          {loadingAllMessages ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-[hsl(222,47%,11%)] animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : allMessages.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No messages sent yet</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {allMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 rounded-lg bg-[hsl(222,47%,11%)] hover:bg-[hsl(217,33%,15%)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {message.subject}
                      </p>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {message.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-500">
                          To: {getRecipientEmail(message.recipient_id)}
                        </span>
                        <span className="text-xs text-slate-600">•</span>
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    {message.is_read && (
                      <CheckCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

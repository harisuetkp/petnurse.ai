import { useState } from "react";
import {
  Mail,
  MailOpen,
  Bell,
  X,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminMessages, AdminMessage } from "@/hooks/useAdminMessages";

export function UserInbox() {
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const { messages, unreadCount, loadingMessages, markAsRead } = useAdminMessages();

  const handleOpenMessage = (message: AdminMessage) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      markAsRead(message.id);
    }
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full hover:bg-accent"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-primary text-primary-foreground text-[10px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Messages
            </SheetTitle>
            <SheetDescription>
              Messages from PetNurse team
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)]">
            {loadingMessages ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-muted animate-pulse rounded-xl"
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center">
                <MailOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  We'll notify you when there's something important
                </p>
              </div>
            ) : (
              <div className="p-2">
                {messages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleOpenMessage(message)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl transition-colors mb-1",
                      "hover:bg-accent",
                      !message.is_read && "bg-primary/5 border border-primary/20"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-1 p-2 rounded-full shrink-0",
                          message.is_read
                            ? "bg-muted"
                            : "bg-primary/20"
                        )}
                      >
                        {message.is_read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={cn(
                              "font-medium truncate",
                              !message.is_read && "text-foreground font-semibold"
                            )}
                          >
                            {message.subject}
                          </h4>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {message.content}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Message Detail Dialog */}
      <Dialog
        open={!!selectedMessage}
        onOpenChange={(open) => !open && setSelectedMessage(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedMessage &&
                formatDistanceToNow(new Date(selectedMessage.created_at), {
                  addSuffix: true,
                })}
            </p>
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground whitespace-pre-wrap">
                {selectedMessage?.content}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import type { DashboardAgentChatState } from "@/features/dashboard-agent/hooks/use-dashboard-agent-chat";

import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Loader2 } from "lucide-react";

type DashboardAgentConversationDialogsProps = {
  chat: DashboardAgentChatState;
};

export function DashboardAgentConversationDialogs({
  chat,
}: DashboardAgentConversationDialogsProps) {
  return (
    <>
      <Dialog
        open={chat.isRenameDialogOpen}
        onOpenChange={(open) => !open && chat.closeRenameDialog()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Give this thread a title you can find later.</DialogDescription>
          </DialogHeader>
          <Input
            value={chat.renameDraft}
            autoFocus
            placeholder="Conversation title"
            onChange={(event) => chat.setRenameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void chat.submitRenameConversation();
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={chat.closeRenameDialog}>
              Cancel
            </Button>
            <Button
              disabled={!chat.renameDraft.trim() || chat.isRenamingConversation}
              onClick={() => void chat.submitRenameConversation()}
            >
              {chat.isRenamingConversation ? (
                <Loader2 className="size-4 motion-safe:animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={chat.isDeleteDialogOpen}
        onOpenChange={(open) => !open && chat.closeDeleteDialog()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              This removes "{chat.activeConversationTitle}" and its messages. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={chat.closeDeleteDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={chat.isDeletingConversation}
              onClick={() => void chat.confirmDeleteConversation()}
            >
              {chat.isDeletingConversation ? (
                <Loader2 className="size-4 motion-safe:animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

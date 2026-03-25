import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Plus, Pin, Lock, Send, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth as useAuthHook } from "@/hooks/useAuth";

const Discussions = () => {
  const { user, isAdminOrMod } = useAuth();
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchDiscussions = async () => {
    const { data } = await supabase
      .from("discussions")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (data) setDiscussions(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, username");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p: any) => { map[p.id] = p.username || "Anonymous"; });
      setProfiles(map);
    }
  };

  useEffect(() => {
    fetchDiscussions();
    fetchProfiles();

    const channel = supabase
      .channel("discussions-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "discussions" }, () => fetchDiscussions())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "discussion_replies" }, () => {
        if (expanded) fetchReplies(expanded);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [expanded]);

  const fetchReplies = async (discussionId: string) => {
    const { data } = await supabase
      .from("discussion_replies")
      .select("*")
      .eq("discussion_id", discussionId)
      .order("created_at", { ascending: true });
    if (data) setReplies(prev => ({ ...prev, [discussionId]: data }));
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      fetchReplies(id);
    }
  };

  const createDiscussion = async () => {
    if (!newTitle.trim() || !newBody.trim() || !user) return;
    setCreating(true);
    const { error } = await supabase.from("discussions").insert({
      title: newTitle.trim(),
      body: newBody.trim(),
      user_id: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Discussion created!");
      setNewTitle(""); setNewBody(""); setDialogOpen(false);
      fetchDiscussions();
    }
    setCreating(false);
  };

  const postReply = async (discussionId: string) => {
    const text = replyTexts[discussionId] || "";
    if (!text.trim() || !user) return;
    const { error } = await supabase.from("discussion_replies").insert({
      discussion_id: discussionId,
      body: text.trim(),
      user_id: user.id,
    });
    if (error) toast.error(error.message);
    else {
      setReplyTexts(prev => ({ ...prev, [discussionId]: "" }));
      fetchReplies(discussionId);
      // Update discussion's updated_at
      await supabase.from("discussions").update({ updated_at: new Date().toISOString() }).eq("id", discussionId);
    }
  };

  const deleteDiscussion = async (id: string) => {
    if (!window.confirm("Delete this discussion and all its replies?")) return;
    await supabase.from("discussion_replies").delete().eq("discussion_id", id);
    await supabase.from("discussions").delete().eq("id", id);
    toast.success("Discussion deleted.");
    if (expanded === id) setExpanded(null);
    fetchDiscussions();
  };

  const togglePin = async (id: string, current: boolean) => {
    await supabase.from("discussions").update({ pinned: !current }).eq("id", id);
    toast.success(current ? "Unpinned." : "Pinned.");
    fetchDiscussions();
  };

  const toggleLock = async (id: string, current: boolean) => {
    await supabase.from("discussions").update({ locked: !current }).eq("id", id);
    toast.success(current ? "Unlocked." : "Locked.");
    fetchDiscussions();
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-gold" />
          <h1 className="font-display text-3xl font-bold text-foreground">Discussions</h1>
          <Badge variant="outline" className="border-border">{discussions.length} threads</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Plus className="h-4 w-4 mr-1" /> New Discussion
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Start a Discussion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="bg-secondary border-border"
              />
              <Textarea
                placeholder="What's on your mind?"
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                className="bg-secondary border-border min-h-[120px]"
              />
              <Button onClick={createDiscussion} disabled={creating || !newTitle.trim() || !newBody.trim()} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">
                {creating ? "Posting..." : "Post Discussion"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {discussions.map(d => {
          const replyCount = replies[d.id]?.length;
          return (
            <Card key={d.id} className={`bg-card border-border ${expanded === d.id ? "border-gold/20" : ""}`}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleExpand(d.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {d.pinned && <Pin className="h-4 w-4 text-gold shrink-0" />}
                    {d.locked && <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <CardTitle className="font-display text-base truncate">{d.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {profiles[d.user_id] || "Anonymous"} • {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </span>
                    {isAdminOrMod && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePin(d.id, d.pinned)}>
                          <Pin className={`h-3 w-3 ${d.pinned ? "text-gold" : "text-muted-foreground"}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleLock(d.id, d.locked)}>
                          <Lock className={`h-3 w-3 ${d.locked ? "text-destructive" : "text-muted-foreground"}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteDiscussion(d.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                    {expanded === d.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>

              {expanded === d.id && (
                <CardContent className="space-y-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{d.body}</p>

                  {/* Replies */}
                  <div className="space-y-2 pl-4 border-l-2 border-border">
                    {(replies[d.id] || []).map((r: any) => (
                      <div key={r.id} className="p-3 rounded bg-secondary/30">
                        <p className="text-xs text-muted-foreground mb-1">
                          {profiles[r.user_id] || "Anonymous"} • {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </p>
                        <p className="text-sm text-foreground">{r.body}</p>
                      </div>
                    ))}
                    {(replies[d.id] || []).length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">No replies yet. Be the first!</p>
                    )}
                  </div>

                  {!d.locked && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write a reply..."
                        value={replyTexts[d.id] || ""}
                        onChange={e => setReplyTexts(prev => ({ ...prev, [d.id]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && postReply(d.id)}
                        className="bg-secondary border-border"
                      />
                      <Button onClick={() => postReply(d.id)} size="icon" className="bg-gold text-gold-foreground hover:bg-gold/90 shrink-0">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {d.locked && (
                    <p className="text-center text-xs text-muted-foreground py-2">🔒 This discussion is locked.</p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}

        {discussions.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No discussions yet. Start the conversation!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Discussions;

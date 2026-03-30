import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, Pin, Lock, Unlock, Trash2, Send, Plus } from "lucide-react";
import { format } from "date-fns";

const DiscussionPanel = () => {
  const { user, isAdmin, isAdminOrMod } = useAuth();
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [selectedDiscussion, setSelectedDiscussion] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, username");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p: any) => { map[p.id] = p.username || "Anonymous"; });
      setProfiles(map);
    }
  };

  const fetchDiscussions = async () => {
    const { data } = await supabase
      .from("discussions")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setDiscussions(data);
  };

  const fetchReplies = async (discussionId: string) => {
    const { data } = await supabase
      .from("discussion_replies")
      .select("*")
      .eq("discussion_id", discussionId)
      .order("created_at", { ascending: true });
    if (data) setReplies(data);
  };

  useEffect(() => { fetchDiscussions(); fetchProfiles(); }, []);

  useEffect(() => {
    if (!selectedDiscussion) return;
    fetchReplies(selectedDiscussion.id);
    const channel = supabase
      .channel(`admin-replies-${selectedDiscussion.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "discussion_replies", filter: `discussion_id=eq.${selectedDiscussion.id}` }, () => {
        fetchReplies(selectedDiscussion.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDiscussion]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newBody.trim() || !user) return;
    setCreating(true);
    const { error } = await supabase.from("discussions").insert({
      user_id: user.id, title: newTitle.trim(), body: newBody.trim(),
    });
    if (error) toast.error("Error: " + error.message);
    else { toast.success("Discussion created."); setNewTitle(""); setNewBody(""); fetchDiscussions(); }
    setCreating(false);
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !user || !selectedDiscussion) return;
    const { error } = await supabase.from("discussion_replies").insert({
      discussion_id: selectedDiscussion.id, user_id: user.id, body: replyBody.trim(),
    });
    if (error) toast.error("Error: " + error.message);
    else setReplyBody("");
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
    if (selectedDiscussion?.id === id) setSelectedDiscussion({ ...selectedDiscussion, locked: !current });
  };

  const deleteDiscussion = async (id: string) => {
    if (!window.confirm("Delete this discussion?")) return;
    await supabase.from("discussions").delete().eq("id", id);
    toast.success("Discussion deleted.");
    if (selectedDiscussion?.id === id) setSelectedDiscussion(null);
    fetchDiscussions();
  };

  if (selectedDiscussion) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedDiscussion(null)} className="text-muted-foreground">← Back</Button>
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                {selectedDiscussion.pinned && <Pin className="h-4 w-4 text-gold" />}
                {selectedDiscussion.title}
                {selectedDiscussion.locked && <Lock className="h-4 w-4 text-destructive" />}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => togglePin(selectedDiscussion.id, selectedDiscussion.pinned)}>
                  <Pin className={`h-4 w-4 ${selectedDiscussion.pinned ? "text-gold" : "text-muted-foreground"}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggleLock(selectedDiscussion.id, selectedDiscussion.locked)}>
                  {selectedDiscussion.locked ? <Unlock className="h-4 w-4 text-green-400" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">{profiles[selectedDiscussion.user_id] || "Anonymous"} • {format(new Date(selectedDiscussion.created_at), "MMM d, yyyy HH:mm")}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selectedDiscussion.body}</p>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {replies.map(r => (
                <div key={r.id} className="p-3 rounded-lg bg-secondary/20 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">{profiles[r.user_id] || "Anonymous"} • {format(new Date(r.created_at), "MMM d, HH:mm")}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{r.body}</p>
                </div>
              ))}
              {replies.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No replies yet.</p>}
            </div>
            {!selectedDiscussion.locked && (
              <div className="flex gap-2">
                <Input value={replyBody} onChange={e => setReplyBody(e.target.value)} placeholder="Write a reply..." className="bg-secondary border-border flex-1" onKeyDown={e => e.key === "Enter" && handleReply()} />
                <Button onClick={handleReply} size="icon" className="bg-gold text-gold-foreground"><Send className="h-4 w-4" /></Button>
              </div>
            )}
            {selectedDiscussion.locked && <p className="text-center text-sm text-muted-foreground py-2">This discussion is locked.</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Plus className="h-5 w-5 text-gold" /> New Discussion</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Discussion title..." className="bg-secondary border-border" /></div>
          <div className="space-y-2"><Label>Body</Label><Textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Write your post..." className="bg-secondary border-border min-h-[100px]" /></div>
          <Button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newBody.trim()} className="bg-gold text-gold-foreground hover:bg-gold/90">{creating ? "Creating..." : "Post Discussion"}</Button>
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><MessageSquare className="h-5 w-5 text-gold" /> Discussions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {discussions.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-gold/20 transition-colors cursor-pointer" onClick={() => setSelectedDiscussion(d)}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {d.pinned && <Pin className="h-3 w-3 text-gold flex-shrink-0" />}
                  {d.locked && <Lock className="h-3 w-3 text-destructive flex-shrink-0" />}
                  <span className="font-medium text-foreground truncate">{d.title}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{profiles[d.user_id] || "Anonymous"} • {format(new Date(d.created_at), "MMM d")}</span>
                </div>
                <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); deleteDiscussion(d.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {discussions.length === 0 && <p className="text-center text-muted-foreground py-8">No discussions yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiscussionPanel;

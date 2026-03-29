import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Swords, Trophy, Shield, MessageSquare, FlaskConical, AlertTriangle, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const Manual = () => {
  return (
    <div className="container py-10 max-w-4xl space-y-8">
      <div className="text-center space-y-3">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
          Aletheia <span className="text-gold">Arena</span> Manual
        </h1>
        <p className="text-muted-foreground text-lg">
          Everything you need to know about the competitive mathematics platform.
        </p>
      </div>

      {/* What is Aletheia Arena */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            What is Aletheia Arena?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground">
          <p>
            Aletheia Arena is a globally recognized, lifetime continuous competitive mathematics platform. 
            Compete in real-time tournaments, olympiad-style challenges, and JEE mock tests. 
            Your performance is tracked via a persistent Elo rating that reflects your mathematical mastery.
          </p>
        </CardContent>
      </Card>

      {/* Competition Types */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Swords className="h-5 w-5 text-gold" />
            Competition Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <div className="space-y-2">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <Swords className="h-4 w-4 text-gold" /> Tournaments
            </h3>
            <p>Continuous ranked battles. Compete in real-time under a strict timer with anti-cheat enforcement.</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-400" /> Olympiads
            </h3>
            <p>Scheduled olympiad-style challenges requiring deep mathematical thinking and proof-based reasoning.</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-emerald-400" /> JEE Mocks
            </h3>
            <p>JEE-style mock tests to sharpen your skills under exam pressure. Timed and graded automatically.</p>
          </div>
        </CardContent>
      </Card>

      {/* How Elo Works */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            How Elo Rating Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>Every new competitor starts at <Badge variant="secondary">1200 Elo</Badge>. Your rating changes based on the difficulty of problems you solve:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
              <div key={d} className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-foreground font-bold text-lg">{d}/10</div>
                <div className="text-xs text-gold font-semibold">+{d * 5} Elo</div>
              </div>
            ))}
          </div>
          <p className="text-sm">
            <span className="text-destructive font-semibold">Wrong answers</span> deduct <span className="font-semibold">difficulty × 2</span> Elo. 
            Your rating can never go below 0.
          </p>
          <p className="text-sm">
            Elo applies universally across all competition types — tournaments, olympiads, and JEE mocks.
          </p>
        </CardContent>
      </Card>

      {/* How to Compete */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gold" />
            How to Compete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Sign in with your Google account.</li>
            <li>Navigate to Tournaments, Olympiads, or JEE Mocks.</li>
            <li>Click <Badge variant="outline">Register</Badge> on an upcoming competition.</li>
            <li>When the competition starts, click <Badge variant="outline">Enter Competition</Badge>.</li>
            <li>Your browser enters fullscreen mode — this is mandatory.</li>
            <li>Solve each problem and submit your answer. Navigate between questions freely.</li>
            <li>When the timer expires, all unanswered questions are auto-submitted.</li>
            <li>Results are revealed after the competition ends for all participants.</li>
          </ol>
        </CardContent>
      </Card>

      {/* Anti-Cheat */}
      <Card className="bg-card border-border border-destructive/30">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Anti-Cheat Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li><span className="text-foreground font-semibold">Fullscreen Lock:</span> You must stay in fullscreen. Exiting once gives a warning. Exiting twice locks you out and auto-submits all answers.</li>
            <li><span className="text-foreground font-semibold">Tab Switching:</span> Switching tabs is logged and adds penalty strikes to your profile.</li>
            <li><span className="text-foreground font-semibold">Image Protection:</span> Problem images cannot be dragged, right-clicked, or copied.</li>
            <li><span className="text-foreground font-semibold">Clipboard & DevTools:</span> Copying content and opening developer tools are blocked during competitions.</li>
          </ul>
          <p className="text-sm text-destructive/80 font-medium">
            Accumulated penalty strikes may lead to account suspension at the admin's discretion.
          </p>
        </CardContent>
      </Card>

      {/* Leaderboard & Profile */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-gold" />
            Leaderboard & Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground">
          <p>The global leaderboard ranks all competitors by Elo. Your profile shows:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Current Elo rating and global rank</li>
            <li>Elo history chart over time</li>
            <li>Past competition results</li>
            <li>Tier badge (Bronze → Silver → Gold → Platinum → Diamond → Grandmaster)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Discussions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            Discussions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground">
          <p>
            The Discussions section is a community forum where competitors can discuss problems, 
            share strategies, and connect with fellow mathematicians. Admins and moderators can 
            pin important threads and lock discussions when needed.
          </p>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* COMA Section */}
      <Card className="bg-card border-gold/30 border-2">
        <CardHeader>
          <CardTitle className="font-display text-2xl flex items-center gap-2 text-gold">
            <Shield className="h-6 w-6" />
            🏛 COMA — Council of Owners for Mathematical Administration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-muted-foreground">
            The Council of Owners for Mathematics Administration is now open for elite community leaders. 
            To maintain the integrity of our network, membership is strictly limited to those who meet the following eligibility criteria:
          </p>

          <div className="space-y-3">
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <h3 className="text-foreground font-semibold">1) Direct Ownership</h3>
              <p className="text-muted-foreground text-sm">
                You must be the Founder or primary Lead of a Mathematics (or related STEM) community.
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <h3 className="text-foreground font-semibold">2) Verified Scale</h3>
              <p className="text-muted-foreground text-sm">
                Your community must have a minimum of <span className="text-gold font-bold">500 members</span>.
              </p>
            </div>
          </div>

          <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 space-y-3">
            <p className="text-foreground font-medium">
              ✅ COMA verified groups are given the right to conduct tournaments, olympiads, JEE mocks, and more on Aletheia Arena.
            </p>
            <p className="text-muted-foreground text-sm">
              If you are eligible for COMA and are interested in joining, reach out:
            </p>
            <a
              href="https://t.me/aka_young_mathematician"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="gradient-gold text-primary-foreground font-semibold gap-2">
                <ExternalLink className="h-4 w-4" />
                Join COMA on Telegram
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pb-8">
        © {new Date().getFullYear()} Aletheia Arena. All rights reserved.
      </div>
    </div>
  );
};

export default Manual;

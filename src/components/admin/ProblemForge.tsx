import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ProblemForgeProps {
  onSaved: () => void;
}

const ProblemForge = ({ onSaved }: ProblemForgeProps) => {
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [answerType, setAnswerType] = useState<"text" | "multiple_choice">("text");
  const [mcOptions, setMcOptions] = useState(["", "", "", ""]);
  const [difficulty, setDifficulty] = useState([5]);
  const [category, setCategory] = useState("algebra");
  const [published, setPublished] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are accepted.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleSave = async () => {
    if (!imageFile || !correctAnswer || !user) {
      toast.error("Please upload an image and provide a correct answer.");
      return;
    }

    setUploading(true);
    try {
      const ext = imageFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("problem_images")
        .upload(path, imageFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("problem_images")
        .getPublicUrl(path);

      const { error: insertError } = await supabase.from("question_bank").insert({
        created_by: user.id,
        problem_image_url: urlData.publicUrl,
        correct_answer: correctAnswer,
        answer_type: answerType as any,
        multiple_choice_options: answerType === "multiple_choice" ? mcOptions : null,
        difficulty_weight: difficulty[0],
        category: category as any,
        visibility: published ? "published" as any : "draft" as any,
      });

      if (insertError) throw insertError;

      toast.success("Problem saved successfully!");
      setImageFile(null);
      setImagePreview(null);
      setCorrectAnswer("");
      setMcOptions(["", "", "", ""]);
      setDifficulty([5]);
      onSaved();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Problem Image</CardTitle>
        </CardHeader>
        <CardContent>
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg mx-auto" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                dragActive ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"
              }`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Drag & drop an image or click to browse</p>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Answer Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Answer Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Answer Type</Label>
            <Select value={answerType} onValueChange={(v: "text" | "multiple_choice") => setAnswerType(v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text / Numeric Input</SelectItem>
                <SelectItem value="multiple_choice">Multiple Choice (A/B/C/D)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <Input
              value={correctAnswer}
              onChange={e => setCorrectAnswer(e.target.value)}
              placeholder="Enter the correct answer..."
              className="bg-secondary border-border"
            />
          </div>

          {answerType === "multiple_choice" && (
            <div className="space-y-2">
              <Label>Options (A / B / C / D)</Label>
              {mcOptions.map((opt, i) => (
                <Input
                  key={i}
                  value={opt}
                  onChange={e => {
                    const updated = [...mcOptions];
                    updated[i] = e.target.value;
                    setMcOptions(updated);
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className="bg-secondary border-border"
                />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Difficulty Weight: {difficulty[0]}/10</Label>
            <Slider value={difficulty} onValueChange={setDifficulty} min={1} max={10} step={1} />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number_theory">Number Theory</SelectItem>
                <SelectItem value="algebra">Algebra</SelectItem>
                <SelectItem value="combinatorics">Combinatorics</SelectItem>
                <SelectItem value="geometry">Geometry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={published} onCheckedChange={setPublished} />
            <Label>{published ? "Published" : "Draft"}</Label>
          </div>

          <Button
            onClick={handleSave}
            disabled={uploading || !imageFile || !correctAnswer}
            className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
          >
            {uploading ? "Saving..." : "Save Problem"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProblemForge;

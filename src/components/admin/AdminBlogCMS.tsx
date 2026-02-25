import { useState, useEffect, useCallback, useMemo } from "react";
import DOMPurify from "dompurify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Save,
  ArrowLeft,
  X,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface FaqItem {
  question: string;
  answer: string;
}

type ReviewStatus = "draft" | "needs_review" | "approved" | "published";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  category: string;
  author_name: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  faqs: FaqItem[] | null;
  tags: string[] | null;
  scheduled_at: string | null;
  review_status: ReviewStatus;
}

type PostFormData = {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  author_name: string;
  published: boolean;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  faqs: FaqItem[];
  tags: string[];
  scheduled_at: string;
  review_status: ReviewStatus;
};

const CATEGORIES = [
  "General",
  "Emergency",
  "Nutrition",
  "Wellness",
  "Behavior",
  "Prevention",
  "Toxicology",
  "Senior Care",
];

const emptyForm: PostFormData = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  category: "General",
  author_name: "PetNurse Clinical Team",
  published: false,
  meta_title: "",
  meta_description: "",
  og_image_url: "",
  faqs: [],
  tags: [],
  scheduled_at: "",
  review_status: "draft",
};

interface BlogTemplate {
  name: string;
  description: string;
  form: Partial<PostFormData>;
}

const BLOG_TEMPLATES: BlogTemplate[] = [
  {
    name: "Blank Post",
    description: "Start from scratch with an empty editor.",
    form: {},
  },
  {
    name: "Symptom Guide",
    description: "Structured template for symptom-based clinical articles with 9 sections.",
    form: {
      category: "Wellness",
      tags: ["symptoms", "pet-health", "veterinary-guide"],
      content: `<h2>Quick Answer Summary</h2>
<p>Provide a concise 2–3 sentence answer to the main question. This section helps readers (and search engines) get the key takeaway immediately.</p>

<h2>Symptoms Explained</h2>
<p>Describe the symptoms in detail. What does the pet owner actually see? Include variations by species, breed, or age when relevant.</p>
<ul>
  <li>Symptom 1 — description and what it looks like</li>
  <li>Symptom 2 — description and what it looks like</li>
  <li>Symptom 3 — description and what it looks like</li>
</ul>

<h2>Common Causes</h2>
<p>List and explain the most frequent causes behind these symptoms.</p>
<ol>
  <li><strong>Cause 1</strong> — Brief explanation of why this happens.</li>
  <li><strong>Cause 2</strong> — Brief explanation of why this happens.</li>
  <li><strong>Cause 3</strong> — Brief explanation of why this happens.</li>
</ol>

<h2>When to Worry</h2>
<div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg my-4">
  <p class="font-semibold">⚠️ Warning Signs</p>
  <p>Describe the red-flag symptoms that indicate a serious or emergency situation. Be specific about what pet owners should watch for.</p>
</div>
<ul>
  <li>Red flag 1 — why it's serious</li>
  <li>Red flag 2 — why it's serious</li>
</ul>

<h2>What You Can Do at Home</h2>
<p>Offer safe, practical steps pet owners can take at home while monitoring their pet. Always note limitations.</p>
<ol>
  <li>Home care step 1</li>
  <li>Home care step 2</li>
  <li>Home care step 3</li>
</ol>
<div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg my-4">
  <p class="font-semibold">💡 Important</p>
  <p>Home care is not a substitute for veterinary attention. If symptoms persist or worsen, see a vet.</p>
</div>

<h2>When to See a Vet</h2>
<p>Clearly outline the scenarios that require professional veterinary care. Include urgency timelines (e.g., within 24 hours, immediately).</p>
<ul>
  <li><strong>Immediately:</strong> Scenario description</li>
  <li><strong>Within 24 hours:</strong> Scenario description</li>
  <li><strong>Schedule a visit:</strong> Scenario description</li>
</ul>

<h2>Questions to Ask Your Vet</h2>
<p>Help pet owners prepare for their vet visit with targeted questions.</p>
<ol>
  <li>"Question pet owners should ask their vet"</li>
  <li>"Question pet owners should ask their vet"</li>
  <li>"Question pet owners should ask their vet"</li>
</ol>

<h3>Professional Disclaimer</h3>
<div class="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg my-4">
  <p class="font-semibold">📋 Disclaimer</p>
  <p>This article is for informational purposes only and is not a substitute for professional veterinary advice, diagnosis, or treatment. Always consult a qualified veterinarian for concerns about your pet's health. If your pet is in distress, seek emergency veterinary care immediately.</p>
</div>`,
      faqs: [
        { question: "Is [symptom] an emergency?", answer: "Replace with a clear answer about when this symptom is and isn't an emergency." },
        { question: "Can I treat [symptom] at home?", answer: "Replace with guidance on safe home care and when professional help is needed." },
        { question: "How long does [symptom] usually last?", answer: "Replace with typical duration and when persistence becomes concerning." },
      ],
    },
  },
];


function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AdminBlogCMS() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<PostFormData>(emptyForm);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autosaveTimer, setAutosaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft" | "needs_review" | "approved" | "scheduled">("all");

  const isEditorOpen = isCreating || !!editingPost;

  // Fetch all posts (admin can see all)
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BlogPost[];
    },
  });

  const filteredPosts = useMemo(() => {
    if (filterStatus === "all") return posts;
    if (filterStatus === "published") return posts.filter((p) => p.published);
    if (filterStatus === "draft") return posts.filter((p) => p.review_status === "draft");
    if (filterStatus === "needs_review") return posts.filter((p) => p.review_status === "needs_review");
    if (filterStatus === "approved") return posts.filter((p) => p.review_status === "approved");
    if (filterStatus === "scheduled") return posts.filter((p) => !!p.scheduled_at && !p.published);
    return posts;
  }, [posts, filterStatus]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; form: PostFormData }) => {
      const reviewStatus = data.form.published ? "published" : data.form.review_status;
      const payload = {
        title: data.form.title,
        slug: data.form.slug,
        content: data.form.content,
        excerpt: data.form.excerpt || null,
        category: data.form.category,
        author_name: data.form.author_name,
        published: data.form.published,
        published_at: data.form.published ? (editingPost?.published_at || new Date().toISOString()) : null,
        meta_title: data.form.meta_title || null,
        meta_description: data.form.meta_description || null,
        og_image_url: data.form.og_image_url || null,
        faqs: data.form.faqs as any,
        tags: data.form.tags,
        scheduled_at: data.form.scheduled_at || null,
        review_status: reviewStatus,
      };

      if (data.id) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: "Saved", description: "Blog post saved successfully." });
      closeEditor();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: "Deleted", description: "Blog post deleted." });
    },
  });

  const closeEditor = useCallback(() => {
    setEditingPost(null);
    setIsCreating(false);
    setForm(emptyForm);
    if (autosaveTimer) clearTimeout(autosaveTimer);
  }, [autosaveTimer]);

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const openCreate = (template?: BlogTemplate) => {
    const base = { ...emptyForm, ...(template?.form || {}) };
    setForm(base);
    setIsCreating(true);
    setEditingPost(null);
    setShowTemplateSelector(false);
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || "",
      category: post.category,
      author_name: post.author_name,
      published: post.published,
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      og_image_url: post.og_image_url || "",
      faqs: Array.isArray(post.faqs) ? post.faqs : [],
      tags: Array.isArray(post.tags) ? post.tags : [],
      scheduled_at: post.scheduled_at || "",
      review_status: (post.review_status as ReviewStatus) || "draft",
    });
    setEditingPost(post);
    setIsCreating(false);
  };

  const duplicatePost = (post: BlogPost) => {
    setForm({
      title: `${post.title} (Copy)`,
      slug: `${post.slug}-copy`,
      content: post.content,
      excerpt: post.excerpt || "",
      category: post.category,
      author_name: post.author_name,
      published: false,
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      og_image_url: post.og_image_url || "",
      faqs: Array.isArray(post.faqs) ? post.faqs : [],
      tags: Array.isArray(post.tags) ? post.tags : [],
      scheduled_at: "",
      review_status: "draft",
    });
    setIsCreating(true);
    setEditingPost(null);
  };

  // Autosave for drafts (every 30s when form changes)
  const updateField = useCallback(
    <K extends keyof PostFormData>(key: K, value: PostFormData[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        // Auto-slug from title when creating
        if (key === "title" && (isCreating || !editingPost)) {
          next.slug = slugify(value as string);
        }
        return next;
      });
    },
    [isCreating, editingPost]
  );

  // Autosave effect
  useEffect(() => {
    if (!isEditorOpen || !editingPost) return;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    const timer = setTimeout(() => {
      if (editingPost && !form.published) {
        saveMutation.mutate({ id: editingPost.id, form });
      }
    }, 30000);
    setAutosaveTimer(timer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, editingPost?.id]);

  const handleSave = () => {
    if (!form.title || !form.slug) {
      toast({ title: "Missing fields", description: "Title and slug are required.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ id: editingPost?.id, form });
  };

  // FAQ management
  const addFaq = () => updateField("faqs", [...form.faqs, { question: "", answer: "" }]);
  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...form.faqs];
    updated[index] = { ...updated[index], [field]: value };
    updateField("faqs", updated);
  };
  const removeFaq = (index: number) => {
    updateField("faqs", form.faqs.filter((_, i) => i !== index));
  };

  // Tag management
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      updateField("tags", [...form.tags, tag]);
    }
    setTagInput("");
  };
  const removeTag = (tag: string) => {
    updateField("tags", form.tags.filter((t) => t !== tag));
  };

  const getStatusBadge = (post: BlogPost) => {
    if (post.published) return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Published</Badge>;
    if (post.scheduled_at && !post.published) return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Scheduled</Badge>;
    if (post.review_status === "needs_review") return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">Needs Review</Badge>;
    if (post.review_status === "approved") return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">Approved</Badge>;
    return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Draft</Badge>;
  };

  // ─── EDITOR VIEW ─────────────────────────────────────
  if (isEditorOpen) {
    return (
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={closeEditor} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to posts
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="border-slate-600 text-slate-300">
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
              <Save className="h-4 w-4 mr-1.5" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="bg-[hsl(217,33%,17%)]">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="seo">SEO & Meta</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* ── Content Tab ─────────────────── */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Article title"
                className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="url-friendly-slug"
                className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-slate-300">Excerpt</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                placeholder="Brief summary..."
                rows={2}
                className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-slate-300">Content (HTML)</Label>
                <div className="flex gap-1">
                  {[
                    { label: "H2", html: "<h2>Heading</h2>" },
                    { label: "H3", html: "<h3>Subheading</h3>" },
                    { label: "UL", html: "<ul>\n  <li>Item</li>\n</ul>" },
                    { label: "OL", html: "<ol>\n  <li>Step 1</li>\n</ol>" },
                    { label: "Callout", html: '<div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg my-4">\n  <p class="font-semibold">Important</p>\n  <p>Your callout text here.</p>\n</div>' },
                    { label: "IMG", html: '<img src="URL" alt="Description" loading="lazy" />' },
                  ].map((btn) => (
                    <Button
                      key={btn.label}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs border-slate-600 text-slate-400 hover:text-white"
                      onClick={() => updateField("content", form.content + "\n" + btn.html)}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={form.content}
                onChange={(e) => updateField("content", e.target.value)}
                placeholder="<h2>Section Title</h2>\n<p>Your content here...</p>"
                rows={16}
                className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white font-mono text-sm"
              />
            </div>
          </TabsContent>

          {/* ── SEO Tab ─────────────────── */}
          <TabsContent value="seo" className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Meta Title</Label>
              <Input
                value={form.meta_title}
                onChange={(e) => updateField("meta_title", e.target.value)}
                placeholder="Custom page title for search engines (max 60 chars)"
                maxLength={60}
                className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white"
              />
              <p className="text-xs text-slate-500 mt-1">{form.meta_title.length}/60</p>
            </div>
            <div>
              <Label className="text-slate-300">Meta Description</Label>
              <Textarea
                value={form.meta_description}
                onChange={(e) => updateField("meta_description", e.target.value)}
                placeholder="Custom description for search engines (max 160 chars)"
                maxLength={160}
                rows={2}
                className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white"
              />
              <p className="text-xs text-slate-500 mt-1">{form.meta_description.length}/160</p>
            </div>
            <div>
              <Label className="text-slate-300">OG Image URL</Label>
              <Input
                value={form.og_image_url}
                onChange={(e) => updateField("og_image_url", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Tags</Label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add a tag..."
                  className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white"
                />
                <Button variant="outline" size="sm" onClick={addTag} className="border-slate-600 text-slate-300">
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── FAQs Tab ─────────────────── */}
          <TabsContent value="faqs" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">FAQ Items</Label>
              <Button variant="outline" size="sm" onClick={addFaq} className="border-slate-600 text-slate-300">
                <Plus className="h-3 w-3 mr-1" /> Add FAQ
              </Button>
            </div>
            {form.faqs.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">No FAQs yet. Add questions and answers for FAQ schema.</p>
            )}
            {form.faqs.map((faq, i) => (
              <div key={i} className="p-3 rounded-lg bg-[hsl(217,33%,14%)] border border-[hsl(217,33%,22%)] space-y-2">
                <div className="flex items-start justify-between">
                  <Label className="text-slate-400 text-xs">Question {i + 1}</Label>
                  <button onClick={() => removeFaq(i)} className="text-slate-500 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  value={faq.question}
                  onChange={(e) => updateFaq(i, "question", e.target.value)}
                  placeholder="Question"
                  className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white text-sm"
                />
                <Textarea
                  value={faq.answer}
                  onChange={(e) => updateFaq(i, "answer", e.target.value)}
                  placeholder="Answer"
                  rows={2}
                  className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white text-sm"
                />
              </div>
            ))}
          </TabsContent>

          {/* ── Settings Tab ─────────────────── */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Category</Label>
              <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                <SelectTrigger className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Author Name</Label>
              <Input
                value={form.author_name}
                onChange={(e) => updateField("author_name", e.target.value)}
                className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Review Status</Label>
              <Select value={form.review_status} onValueChange={(v) => updateField("review_status", v as ReviewStatus)}>
                <SelectTrigger className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Posts must be "Approved" before publishing.</p>
            </div>
            <div>
              <Label className="text-slate-300">Schedule Publish</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => updateField("scheduled_at", e.target.value)}
                className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white"
                disabled={form.review_status !== "approved"}
              />
              {form.review_status !== "approved" && (
                <p className="text-xs text-amber-400 mt-1">Approve the post before scheduling.</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.published}
                onCheckedChange={(v) => {
                  if (v && form.review_status !== "approved") {
                    toast({ title: "Cannot Publish", description: "Post must be approved before publishing.", variant: "destructive" });
                    return;
                  }
                  updateField("published", v);
                }}
              />
              <Label className="text-slate-300">Published</Label>
              {form.review_status !== "approved" && !form.published && (
                <span className="text-xs text-amber-400">Requires approval</span>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Preview Dialog ─────────────────── */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview: {form.title || "Untitled"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{form.category}</Badge>
              </div>
              <h1 className="text-2xl font-bold">{form.title || "Untitled"}</h1>
              <p className="text-sm text-muted-foreground">By {form.author_name}</p>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.content, { ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','ul','ol','li','strong','em','a','div','span','img','br','hr','table','thead','tbody','tr','th','td','blockquote','pre','code','figure','figcaption'], ALLOWED_ATTR: ['href','class','id','alt','src','target','rel','width','height'], ALLOW_DATA_ATTR: false }) }}
              />
              {form.faqs.length > 0 && (
                <div className="border-t pt-4">
                  <h2 className="text-lg font-semibold mb-2">FAQs</h2>
                  {form.faqs.map((faq, i) => (
                    <div key={i} className="mb-3">
                      <p className="font-medium">{faq.question}</p>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Blog CMS</h2>
        <Button onClick={() => setShowTemplateSelector(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "published", "approved", "needs_review", "draft", "scheduled"] as const).map((status) => {
          const labels: Record<string, string> = { all: "All", published: "Published", approved: "Approved", needs_review: "Needs Review", draft: "Draft", scheduled: "Scheduled" };
          return (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={filterStatus !== status ? "border-slate-600 text-slate-400" : ""}
            >
              {labels[status]}
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-slate-400 py-8 text-center">Loading posts...</p>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No posts found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between p-4 rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] hover:border-primary/30 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(post)}
                  <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                    {post.category}
                  </Badge>
                </div>
                <h3 className="text-white font-medium truncate">{post.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  /{post.slug} · {format(new Date(post.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(post)} className="text-slate-400 hover:text-white h-8 w-8 p-0">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => duplicatePost(post)} className="text-slate-400 hover:text-white h-8 w-8 p-0">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Delete this post?")) deleteMutation.mutate(post.id);
                  }}
                  className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* ── Template Selector Dialog ─────────────────── */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {BLOG_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => openCreate(tpl)}
                className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <p className="font-medium text-foreground text-sm">{tpl.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

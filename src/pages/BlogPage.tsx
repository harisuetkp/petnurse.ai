import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Search } from "lucide-react";
import { SeoHead } from "@/components/seo/SeoHead";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, category, published_at, author_name, og_image_url")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(() => {
    if (!posts) return ["All"];
    const cats = Array.from(new Set(posts.map((p) => p.category)));
    return ["All", ...cats.sort()];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    let filtered = posts;
    if (activeCategory !== "All") {
      filtered = filtered.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [posts, activeCategory, searchQuery]);

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Clinical Insights", path: "/blog" },
  ];

  const defaultImage =
    "https://storage.googleapis.com/gpt-engineer-file-uploads/VRLrdsVR9dP3qLHqfvpKEH0FC7r1/social-images/social-1770849878532-39D70AC0-7665-43A8-AF82-C74105554B86.png";

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Pet Health Blog — Clinical Insights | PetNurse AI"
        description="Evidence-based pet health articles from PetNurse AI. Clinical insights on dog and cat symptoms, emergency guidance, and proactive care tips. Updated daily."
        canonicalPath="/blog"
      />
      <BreadcrumbSchema items={breadcrumbItems} />
      <div className="max-w-4xl mx-auto px-4 py-12 pb-32">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Clinical Insights
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Evidence-informed guidance for proactive pet health monitoring — brought to you by{" "}
            <a href="https://petnurseai.com" className="text-primary font-medium hover:underline">
              PetNurse AI
            </a>.
          </p>
        </header>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <Skeleton className="h-44 w-full" />
                <div className="p-5">
                  <Skeleton className="h-4 w-1/3 mb-3" />
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredPosts.map((post, idx) => {
              const hasImage =
                post.og_image_url &&
                post.og_image_url.startsWith("https://") &&
                post.og_image_url.includes("/storage/");
              const imageUrl = hasImage ? post.og_image_url : defaultImage;

              return (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className={`group block rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all overflow-hidden ${
                    idx === 0 ? "md:col-span-2" : ""
                  }`}
                >
                  <div className={`${idx === 0 ? "md:flex" : ""}`}>
                    <div
                      className={`relative overflow-hidden ${
                        idx === 0 ? "md:w-1/2 aspect-video md:aspect-auto" : "aspect-video"
                      }`}
                    >
                      <img
                        src={imageUrl!}
                        alt={`${post.title} — PetNurse AI`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className={`p-5 ${idx === 0 ? "md:w-1/2 md:flex md:flex-col md:justify-center" : ""}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs font-medium">
                          {post.category}
                        </Badge>
                        {post.published_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(post.published_at), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      <h2 className={`font-semibold text-foreground mb-1 ${idx === 0 ? "text-xl" : "text-base"}`}>
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-3">
                        By {post.author_name}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchQuery ? "No articles match your search." : "No articles published yet. Check back soon."}
            </p>
          </div>
        )}

        {/* Blog footer CTA */}
        <div className="mt-12 p-6 rounded-2xl border border-primary/15 bg-primary/5 text-center">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Need help with a pet symptom right now?
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            PetNurse AI provides free, 24/7 structured triage assessments powered by clinical veterinary data.
          </p>
          <Link
            to="/triage"
            className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition"
          >
            Start Free Symptom Check →
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { SeoHead } from "@/components/seo/SeoHead";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";

const POSTS_PER_PAGE = 10;

function estimateReadingTime(excerpt: string | null): number {
  // Rough estimate: avg blog ~800 words, use excerpt length as proxy
  const words = excerpt ? excerpt.split(/\s+/).length : 0;
  const estimated = Math.max(3, Math.round(words / 30)); // scale excerpt
  return Math.min(estimated, 12);
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reset to page 1 when filters change
  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, currentPage]);

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
      <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
        <header className="mb-5">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
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
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs with scroll hint */}
        <div className="relative mb-6">
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
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
          {/* Scroll fade hint on the right for desktop */}
          {categories.length > 5 && (
            <div className="hidden md:block absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          )}
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
        ) : paginatedPosts.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {paginatedPosts.map((post, idx) => {
                const isFirst = idx === 0 && currentPage === 1;
                const hasImage =
                  post.og_image_url &&
                  post.og_image_url.startsWith("https://") &&
                  post.og_image_url.includes("/storage/");
                const imageUrl = hasImage ? post.og_image_url : defaultImage;
                const readTime = estimateReadingTime(post.excerpt);

                return (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className={`group block rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all overflow-hidden ${
                      isFirst ? "md:col-span-2" : ""
                    }`}
                  >
                    <div className={`${isFirst ? "md:flex" : ""}`}>
                      <div
                        className={`relative overflow-hidden ${
                          isFirst ? "md:w-1/2 aspect-video md:aspect-auto" : "aspect-video"
                        }`}
                      >
                        <img
                          src={imageUrl!}
                          alt={`${post.title} — PetNurse AI`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== defaultImage) {
                              target.src = defaultImage;
                            } else {
                              target.style.display = "none";
                            }
                          }}
                        />
                      </div>
                      <div className={`p-5 ${isFirst ? "md:w-1/2 md:flex md:flex-col md:justify-center" : ""}`}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs font-medium">
                            {post.category}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {readTime} min read
                          </span>
                          {post.published_at && (
                            <span className="text-xs text-muted-foreground">
                              · {format(new Date(post.published_at), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                        <h2 className={`font-semibold text-foreground mb-1 ${isFirst ? "text-xl" : "text-base"}`}>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Blog pagination">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, current, and neighbors
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, i, arr) => (
                      <span key={page} className="flex items-center">
                        {i > 0 && arr[i - 1] !== page - 1 && (
                          <span className="px-1 text-muted-foreground text-sm">…</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? "bg-primary text-primary-foreground"
                              : "border border-border bg-card text-foreground hover:bg-muted"
                          }`}
                          aria-label={`Page ${page}`}
                          aria-current={currentPage === page ? "page" : undefined}
                        >
                          {page}
                        </button>
                      </span>
                    ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            )}

            {/* Post count */}
            <p className="text-xs text-muted-foreground text-center mt-3">
              Showing {(currentPage - 1) * POSTS_PER_PAGE + 1}–{Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} article{filteredPosts.length !== 1 ? "s" : ""}
            </p>
          </>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? `No articles match "${searchQuery}"${activeCategory !== "All" ? ` in ${activeCategory}` : ""}. Try a different search term.`
                : activeCategory !== "All"
                ? `No articles in "${activeCategory}" yet. Check back soon or browse all categories.`
                : "No articles published yet. Check back soon."}
            </p>
            {(searchQuery || activeCategory !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("All");
                  setCurrentPage(1);
                }}
                className="mt-3 text-sm text-primary font-medium hover:underline"
              >
                Clear filters
              </button>
            )}
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

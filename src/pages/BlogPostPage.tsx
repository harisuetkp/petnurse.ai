import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { BlogSeoHead } from "@/components/seo/BlogSeoHead";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { TableOfContents, injectHeadingIds } from "@/components/blog/TableOfContents";
import { injectInternalLinks } from "@/lib/blogInternalLinks";
import { FaqSection } from "@/components/blog/FaqSection";
import { BlogCtaBlock } from "@/components/blog/BlogCtaBlock";
import { BlogShareButtons } from "@/components/blog/BlogShareButtons";
import { BlogEmailCapture } from "@/components/blog/BlogEmailCapture";
import { BlogStickyCtaBar } from "@/components/blog/BlogStickyCtaBar";
import { BlogExitIntentNudge } from "@/components/blog/BlogExitIntentNudge";
import { useMemo } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: relatedPosts } = useQuery({
    queryKey: ["blog-related", post?.category, post?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, category, published_at")
        .eq("published", true)
        .eq("category", post!.category)
        .neq("id", post!.id)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!post?.category && !!post?.id,
  });

  const processedContent = useMemo(
    () => (post?.content ? injectInternalLinks(injectHeadingIds(post.content)) : ""),
    [post?.content]
  );

  const faqs = useMemo<FaqItem[]>(() => {
    if (!post?.faqs) return [];
    try {
      const parsed = typeof post.faqs === "string" ? JSON.parse(post.faqs) : post.faqs;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [post?.faqs]);

  const readingTimeMin = useMemo(() => {
    if (!post?.content) return 0;
    const text = post.content.replace(/<[^>]*>/g, "");
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 230));
  }, [post?.content]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 pb-32">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/3 mb-8" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center pb-32">
        <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
        <p className="text-muted-foreground text-sm mb-6">
          This article may have been removed or is no longer available.
        </p>
        <Link to="/blog" className="text-primary text-sm font-medium hover:underline">
          Back to Clinical Insights
        </Link>
      </div>
    );
  }

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Clinical Insights", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <BlogSeoHead
        title={post.title}
        metaTitle={post.meta_title}
        metaDescription={post.meta_description}
        ogImageUrl={post.og_image_url}
        authorName={post.author_name}
        publishedAt={post.published_at}
        category={post.category}
        slug={post.slug}
        excerpt={post.excerpt}
        faqs={faqs}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="max-w-2xl mx-auto px-4 py-12 pb-32">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Clinical Insights
        </Link>

        <article>
          {/* Hero image */}
          {post.og_image_url && post.og_image_url.startsWith("https://") && post.og_image_url.includes("/storage/") && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-border">
              <img
                src={post.og_image_url}
                alt={`${post.title} — PetNurse AI`}
                className="w-full aspect-video object-cover"
              />
            </div>
          )}

          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs font-medium">
                {post.category}
              </Badge>
              {post.published_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(post.published_at), "MMMM d, yyyy")}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>By {post.author_name}</span>
              <span>·</span>
              <span>{readingTimeMin} min read</span>
            </div>
          </header>

          <TableOfContents htmlContent={post.content} />

          <div
            className="prose prose-sm max-w-none text-foreground 
              prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-li:text-muted-foreground
              prose-strong:text-foreground
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:border prose-img:border-border"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedContent, { ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','ul','ol','li','strong','em','a','div','span','img','br','hr','table','thead','tbody','tr','th','td','blockquote','pre','code','figure','figcaption'], ALLOWED_ATTR: ['href','class','id','alt','src','target','rel','width','height'], ALLOW_DATA_ATTR: false }) }}
          />
        </article>

        <BlogShareButtons title={post.title} slug={post.slug} />

        <BlogEmailCapture slug={post.slug} />

        <BlogCtaBlock slug={post.slug} />

        <FaqSection faqs={faqs} />

        {relatedPosts && relatedPosts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Related Articles
            </h2>
            <div className="space-y-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  to={`/blog/${related.slug}`}
                  className="block p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {related.category}
                    </Badge>
                    {related.published_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(related.published_at), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-foreground">
                    {related.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Conversion components */}
      <BlogStickyCtaBar slug={post.slug} />
      <BlogExitIntentNudge slug={post.slug} />
    </div>
  );
}

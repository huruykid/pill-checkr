import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SafetyChecklist } from "@/components/shared/SafetyChecklist";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ArrowLeft, BookOpen, ExternalLink, Loader2 } from "lucide-react";
import { NearbyHelp } from "@/components/shared/NearbyHelp";
import type { Database } from "@/integrations/supabase/types";

type EducationPost = Database["public"]["Tables"]["education_posts"]["Row"];

export default function Education() {
  const { slug } = useParams();
  const [posts, setPosts] = useState<EducationPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<EducationPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (slug && posts.length > 0) {
      const post = posts.find((p) => p.slug === slug);
      setSelectedPost(post || null);
    } else {
      setSelectedPost(null);
    }
  }, [slug, posts]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("education_posts")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-like rendering
  const renderContent = (body: string) => {
    const lines = body.split("\n");
    const elements: JSX.Element[] = [];
    let inList = false;
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="mb-4 space-y-2 pl-6">
            {listItems.map((item, i) => (
              <li key={i} className="list-disc text-muted-foreground">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
      inList = false;
    };

    const renderInline = (text: string) => {
      // Bold
      const parts = text.split(/\*\*(.*?)\*\*/g);
      return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      );
    };

    lines.forEach((line, index) => {
      if (line.startsWith("## ")) {
        flushList();
        elements.push(
          <h2 key={index} className="mb-4 mt-6 text-xl font-bold first:mt-0">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        flushList();
        elements.push(
          <h3 key={index} className="mb-3 mt-5 text-lg font-semibold">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith("- ")) {
        inList = true;
        listItems.push(line.slice(2));
      } else if (line.trim() === "") {
        flushList();
      } else {
        flushList();
        elements.push(
          <p key={index} className="mb-4 text-muted-foreground leading-relaxed">
            {renderInline(line)}
          </p>
        );
      }
    });

    flushList();
    return elements;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container flex min-h-[50vh] items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Single article view
  if (selectedPost) {
    return (
      <Layout>
        <article className="container py-8 md:py-12">
          <div className="mx-auto max-w-2xl">
            <Link 
              to="/education" 
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Articles
            </Link>

            <h1 className="mb-6 text-3xl font-bold md:text-4xl">{selectedPost.title}</h1>
            
            <div className="prose prose-lg max-w-none">
              {renderContent(selectedPost.body)}
            </div>

            <div className="mt-12 border-t border-border pt-8">
              <Link to="/education">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to All Articles
                </Button>
              </Link>
            </div>
          </div>
        </article>
      </Layout>
    );
  }

  // Article list view
  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <BookOpen className="h-4 w-4" />
              Education
            </div>
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">Learn About Safety</h1>
            <p className="text-muted-foreground">
              Essential information for harm reduction and staying safe
            </p>
          </div>
          {/* Fentanyl Test Strip Banner */}
          <Card className="mb-6 border-warning/30 bg-warning-light">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-warning" />
                <div>
                  <h2 className="text-lg font-bold text-warning-foreground">
                    Fentanyl Test Strips Save Lives
                  </h2>
                  <p className="mt-1 text-sm text-warning-foreground/80">
                    Inexpensive strips that detect fentanyl in pills and powders. They cost about $1 each and take just minutes to use.
                  </p>
                </div>
              </div>
              <a
                href="https://dancesafe.org/product/fentanyl-test-strips-pack-of-10-free-shipping/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="warning" className="w-full shrink-0 sm:w-auto">
                  Order Test Strips
                  <ExternalLink className="ml-1 h-4 w-4" />
                </Button>
              </a>
            </CardContent>
          </Card>


          <SafetyChecklist />

          {/* Find Help Nearby */}
          <NearbyHelp className="mb-6" />

          {/* Section Label */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">Articles</h2>
          </div>

          {/* Article Grid */}
          <div className="grid gap-4">
            {posts.map((post) => (
              <Link key={post.id} to={`/education/${post.slug}`}>
                <Card className="transition-all hover:shadow-lg hover:-translate-y-0.5">
                  <CardContent className="p-6">
                    <h2 className="mb-2 text-xl font-semibold text-foreground">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground">
                      {post.summary || "Read more..."}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

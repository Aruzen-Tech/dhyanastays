"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { blogPosts } from "@/lib/mock-data";

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const post = blogPosts.find((p) => p.slug === slug) || blogPosts[0]; // fallback

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="max-w-[800px] mx-auto px-6 lg:px-8 py-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Journal
        </Link>

        <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-4 block">
          {post.category}
        </span>

        <h1 className="heading-display text-3xl md:text-5xl text-foreground mb-6 leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 text-xs text-subtle">
          <span className="font-medium text-muted">{post.author}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>{post.date}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>{post.readTime} read</span>
        </div>
      </div>

      {/* Hero Image */}
      <div className="max-w-[1000px] mx-auto px-6 lg:px-8 mb-16">
        <div className="w-full h-[300px] md:h-[500px] rounded-2xl bg-surface-hover relative overflow-hidden">
          <img
            src={post.image}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[800px] mx-auto px-6 lg:px-8">
        <p className="text-lg text-foreground mb-8 leading-relaxed">
          {post.excerpt}
        </p>

        <h2 className="heading-display text-2xl md:text-3xl text-foreground mt-12 mb-4">
          The Evolution of Hospitality
        </h2>
        <p className="text-muted leading-relaxed mb-6">
          The traditional hotel model was built on predictability. The room in Tokyo looked exactly like the room in New York. But modern travellers are rejecting this homogeneity. They want connection, authenticity, and design that responds to its environment.
        </p>
        <p className="text-muted leading-relaxed mb-6">
          This shift has given rise to the curated stay — properties where the architecture itself is the destination.
        </p>

        <blockquote className="border-l-2 border-primary pl-6 py-2 my-10 text-lg text-foreground italic">
          &ldquo;We don&apos;t remember the rooms that looked like everywhere
          else. We remember the places that made us feel something.&rdquo;
        </blockquote>

        <h2 className="heading-display text-2xl md:text-3xl text-foreground mt-12 mb-4">
          Sustainability as a Baseline
        </h2>
        <p className="text-muted leading-relaxed mb-6">
          Beautiful design is no longer enough. The properties of the future must be functionally integrated with their ecosystem. This means utilizing local materials, implementing passive cooling techniques, and operating with a zero-waste philosophy.
        </p>

        <div className="my-12 p-8 bg-surface border border-border rounded-2xl">
          <h3 className="text-foreground mt-0 mb-4 font-semibold">Read Next</h3>
          <Link href="/blog" className="text-primary hover:underline text-sm font-medium">
            Discover more stories from the journal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { blogPosts } from "@/lib/mock-data";

export default function BlogListingPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...Array.from(new Set(blogPosts.map((p) => p.category)))];

  const filteredPosts =
    activeCategory === "All"
      ? blogPosts
      : blogPosts.filter((p) => p.category === activeCategory);

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="py-20 text-center px-6 border-b border-surface-hover">
        <h1 className="heading-display text-4xl lg:text-6xl text-foreground mb-6">
          The Journal
        </h1>
        <p className="text-muted max-w-2xl mx-auto mb-10">
          Stories about design, sustainable travel, local culture, and the
          future of hospitality.
        </p>

        {/* Categories */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border border-border text-muted hover:text-foreground hover:border-subtle"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Post (if All category) */}
      {activeCategory === "All" && blogPosts.length > 0 && (
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-16">
          <Link
            href={`/blog/${blogPosts[0].slug}`}
            className="group block rounded-2xl overflow-hidden bg-surface border border-surface-hover hover:border-border transition-colors"
          >
            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-3/5 h-64 md:h-[400px] bg-surface-hover relative overflow-hidden">
                <img
                  src={blogPosts[0].image}
                  alt={blogPosts[0].title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="w-full md:w-2/5 p-8 md:p-12 flex flex-col justify-center">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
                  Featured · {blogPosts[0].category}
                </span>
                <h2 className="heading-display text-2xl lg:text-4xl text-foreground mb-4 group-hover:text-primary transition-colors">
                  {blogPosts[0].title}
                </h2>
                <p className="text-muted mb-6 leading-relaxed">
                  {blogPosts[0].excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-subtle mt-auto">
                  <span>{blogPosts[0].author}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{blogPosts[0].date}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{blogPosts[0].readTime} read</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Grid */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 pt-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.slice(activeCategory === "All" ? 1 : 0).map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-2xl overflow-hidden bg-surface border border-surface-hover hover:border-border transition-colors h-full"
            >
              <div className="h-56 bg-surface-hover relative shrink-0 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-3">
                  {post.category}
                </span>
                <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-muted mb-6 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-subtle mt-auto">
                  <span>{post.date}</span>
                  <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                    Read article <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

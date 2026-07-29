"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { faqItems } from "@/lib/mock-data";

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const categories = Array.from(new Set(faqItems.map((item) => item.category)));

  const filteredFAQs = faqItems.filter((item) => {
    const matchesSearch = item.question
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      searchQuery !== "" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-surface border-b border-surface-hover py-16">
        <div className="max-w-[800px] mx-auto px-6 lg:px-8 text-center">
          <h1 className="heading-display text-3xl lg:text-5xl text-foreground mb-4">
            How can we help?
          </h1>
          <p className="text-muted mb-8">
            Find answers to common questions about bookings, hosting, and
            investing.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for an answer..."
              className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-foreground placeholder-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar Categories */}
          <div className="md:w-64 shrink-0">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
              Categories
            </h3>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => {
                      setActiveCategory(cat);
                      setSearchQuery("");
                      setOpenIndex(null);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      activeCategory === cat && searchQuery === ""
                        ? "bg-surface-hover text-foreground font-medium"
                        : "text-subtle hover:text-muted hover:bg-surface"
                    }`}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* FAQ Accordion */}
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              {searchQuery ? "Search Results" : activeCategory}
            </h2>

            {filteredFAQs.length === 0 ? (
              <div className="text-muted py-8 text-center bg-surface rounded-2xl border border-border">
                No questions found matching "{searchQuery}".
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFAQs.map((faq, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <div
                      key={index}
                      className={`border rounded-2xl transition-all ${
                        isOpen
                          ? "bg-surface border-border"
                          : "bg-transparent border-surface-hover hover:border-border"
                      }`}
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                        className="w-full flex items-center justify-between p-5 text-left"
                      >
                        <span className="font-medium text-foreground">
                          {faq.question}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-subtle transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 text-sm text-muted leading-relaxed border-t border-surface-hover pt-4 mt-1">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

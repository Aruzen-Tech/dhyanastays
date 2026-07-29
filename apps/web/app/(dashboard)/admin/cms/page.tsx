"use client";

import { Edit3, Image as ImageIcon, FileText, Send, CheckCircle2, MoreHorizontal } from "lucide-react";

export default function AdminCMSPage() {
  const contentItems = [
    { id: 1, title: "10 Hidden Gems in Himachal", type: "Blog Post", status: "Published", author: "Content Team", views: "12.4K" },
    { id: 2, title: "Summer Retreat Promo 2026", type: "Homepage Banner", status: "Active", author: "Marketing Team", views: "45.2K" },
    { id: 3, title: "Sustainable Tourism Policy", type: "Legal Document", status: "Draft", author: "Legal Dept", views: "-" },
    { id: 4, title: "Kerala Monsoon Experience", type: "Newsletter", status: "Scheduled", author: "Content Team", views: "-" },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="heading-display text-3xl text-foreground mb-2">
            CMS & Marketing
          </h1>
          <p className="text-sm text-muted">
            Manage landing pages, blog posts, marketing campaigns, and site assets.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-surface-hover border border-border text-foreground font-semibold text-sm rounded-xl hover:bg-surface-hover transition-colors">
            Upload Assets
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary-hover transition-colors flex items-center gap-2">
            <Edit3 size={16} /> Create Content
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {["All Content", "Blog Posts", "Landing Pages", "Marketing Banners"].map((tab, i) => (
          <button key={i} className={`p-4 rounded-xl text-sm font-medium text-left transition-colors border ${
            i === 0 ? "bg-surface-hover border-primary/50 text-foreground" : "bg-surface border-border text-muted hover:bg-surface-hover"
          }`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="text-xs uppercase bg-surface-hover text-subtle">
              <tr>
                <th className="px-6 py-4 font-semibold">Content Title</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Author</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Impressions</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contentItems.map((item) => (
                <tr key={item.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-border flex items-center justify-center text-muted">
                        {item.type.includes("Image") || item.type.includes("Banner") ? <ImageIcon size={14} /> : <FileText size={14} />}
                      </div>
                      <span className="font-medium text-foreground">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.type}</td>
                  <td className="px-6 py-4">{item.author}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 ${
                      item.status === "Published" || item.status === "Active" ? "text-sage" :
                      item.status === "Scheduled" ? "text-blue-400" :
                      "text-muted"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        item.status === "Published" || item.status === "Active" ? "bg-sage" :
                        item.status === "Scheduled" ? "bg-blue-400" :
                        "bg-subtle"
                      }`}></div>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{item.views}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-muted hover:text-foreground transition-colors"><MoreHorizontal size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Email Campaign</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Campaign Subject Line" className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary" />
            <select className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-muted focus:outline-none focus:border-primary appearance-none">
              <option>Segment: All active users (14,205)</option>
              <option>Segment: Investors only (342)</option>
              <option>Segment: Premium Hosts (120)</option>
            </select>
            <textarea rows={4} placeholder="HTML Content or plain text..." className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary resize-none"></textarea>
            <button className="w-full py-3 bg-surface-hover border border-border text-foreground font-semibold text-sm rounded-xl hover:bg-surface-hover transition-colors flex items-center justify-center gap-2">
              <Send size={16} /> Send Test Email
            </button>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">SEO & Platform Health</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
               <div className="flex items-center gap-3">
                 <CheckCircle2 className="text-sage" size={20} />
                 <div>
                   <div className="text-sm font-medium text-foreground">XML Sitemap</div>
                   <div className="text-xs text-subtle">Generated & Submitted successfully</div>
                 </div>
               </div>
               <span className="text-xs text-muted">Today, 04:00 AM</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
               <div className="flex items-center gap-3">
                 <CheckCircle2 className="text-sage" size={20} />
                 <div>
                   <div className="text-sm font-medium text-foreground">Page Speed Score</div>
                   <div className="text-xs text-subtle">Desktop: 98/100, Mobile: 92/100</div>
                 </div>
               </div>
               <span className="text-xs text-muted">Yesterday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

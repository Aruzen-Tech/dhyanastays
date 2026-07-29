export default function TermsPage() {
  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <div className="py-16 text-center px-6 border-b border-surface-hover">
        <h1 className="heading-display text-3xl lg:text-5xl text-foreground mb-4">
          Terms & Conditions
        </h1>
        <p className="text-muted">
          Last updated: July 10, 2026
        </p>
      </div>

      {/* Content */}
      <div className="max-w-[800px] mx-auto px-6 lg:px-8 py-16">
        <div className="prose prose-invert prose-p:text-muted prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-foreground prose-headings:font-normal prose-a:text-primary">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Dhyana Stays. These Terms and Conditions govern your use of our platform, website, mobile applications, and all related services provided by Dhyana Architecture & Hospitality Private Limited.
          </p>

          <h2>2. Curated Stays Philosophy</h2>
          <p>
            Unlike open marketplace platforms, Dhyana Stays is a curated ecosystem. We reserve the right to approve, reject, or remove any property listing based on our proprietary architectural, sustainability, and hospitality inspection criteria.
          </p>

          <h2>3. Bookings and Payments</h2>
          <p>
            When you book a stay or experience through Dhyana Stays, you are entering into a contract directly with the Host or Vendor. Dhyana acts as the platform provider and payment collection agent.
          </p>
          <ul>
            <li>All payments are processed securely through our authorized payment gateways.</li>
            <li>Platform fees and applicable taxes are non-refundable unless specified otherwise in the property's cancellation policy.</li>
          </ul>

          <h2>4. Cancellation Policies</h2>
          <p>
            Each curated stay has its own specific cancellation policy set by the Host, which is clearly displayed during the booking process. By completing a booking, you agree to be bound by the specific cancellation terms of that property.
          </p>

          <h2>5. Fractional Investment Module</h2>
          <p>
            Participation in the Split Investment (Fractional Ownership) module requires a separate legal agreement. The information provided on the platform regarding returns is projective and does not guarantee financial performance. Investments are subject to market risks.
          </p>

          <h2>6. Code of Conduct</h2>
          <p>
            As a guest, you agree to treat the properties, hosts, and local communities with utmost respect. Any damage to property or violation of house rules may result in additional charges and suspension from the Dhyana Stays network.
          </p>
        </div>
      </div>
    </div>
  );
}

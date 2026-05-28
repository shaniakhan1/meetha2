export default function Terms() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-sand/40">
        <a
          href="/"
          className="font-sans text-xs tracking-widest uppercase text-charcoal-soft hover:text-charcoal transition-colors"
        >
          Back
        </a>
        <a href="/" className="font-serif text-lg tracking-widest text-charcoal hover:opacity-70 transition-opacity">MEETHA</a>
        <div className="w-12" />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div>
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">Legal</p>
          <h1 className="font-serif font-light text-3xl text-charcoal mb-2">Terms of Service</h1>
          <p className="font-sans text-xs text-charcoal-soft">Effective date: May 25, 2025</p>
        </div>

        <div className="space-y-8 font-sans font-light text-sm text-charcoal-soft leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">1. Agreement</h2>
            <p>
              By creating an account or using Meetha at meetha.studio ("the Service"), you agree to these Terms of Service. If you do not agree, do not use the Service. These terms form a binding agreement between you and Meetha.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">2. Eligibility</h2>
            <p>
              You must be at least 13 years old to use Meetha. If you are under 18, you represent that a parent or legal guardian has reviewed and agreed to these terms on your behalf.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">3. Your account</h2>
            <p>
              You are responsible for maintaining the security of your account. You agree to notify us immediately at hello@meetha.studio if you suspect unauthorized access. We are not liable for any loss resulting from unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">4. Acceptable use</h2>
            <p>You agree not to use Meetha to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Generate content that is illegal, defamatory, harassing, or harmful to others.</li>
              <li>Generate content that infringes the intellectual property rights of any third party.</li>
              <li>Generate content depicting minors in a sexual context.</li>
              <li>Attempt to reverse-engineer, scrape, or systematically extract data from the Service.</li>
              <li>Use the Service to train or fine-tune AI models without our express written permission.</li>
              <li>Circumvent any usage limits, credits system, or access controls.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms without refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">5. Content ownership</h2>
            <p>
              You retain ownership of any content you upload to Meetha, including reference images. You grant us a limited license to process that content solely to provide the Service.
            </p>
            <p>
              For AI-generated images and captions produced by the Service: you own the output and may use it for any lawful purpose, including commercial use. We do not claim ownership of your generated content.
            </p>
            <p>
              On the free plan, generated images include a "meetha" watermark. By downloading and sharing watermarked content, you agree not to remove or obscure the watermark.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">6. Credits and subscriptions</h2>
            <p>
              Free accounts receive a limited number of generation credits. Paid plans (Starter and Pro) are billed monthly via Stripe. Subscriptions renew automatically unless cancelled before the renewal date.
            </p>
            <p>
              Credits do not roll over between billing periods. We do not offer refunds for unused credits or partial billing periods, except where required by applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">7. Service availability</h2>
            <p>
              We aim to keep Meetha available at all times but do not guarantee uninterrupted access. We may modify, suspend, or discontinue the Service at any time with reasonable notice. We are not liable for any loss resulting from downtime or service changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">8. Disclaimer of warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that generated content will be accurate, appropriate for your intended use, or free from errors. AI-generated content may be unexpected or imperfect.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">9. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Meetha and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability to you for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">10. Governing law</h2>
            <p>
              These terms are governed by the laws of the State of Texas, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Texas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">11. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. We will notify you of material changes by email or by posting a notice on the Service. Continued use after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">12. Contact</h2>
            <p>
              For questions about these terms, email us at hello@meetha.studio.
            </p>
          </section>
        </div>
      </div>

      <footer className="py-8 px-6 border-t border-sand/30 text-center">
        <p className="font-sans text-xs text-charcoal-soft/50 tracking-wide">
          meetha.studio &nbsp;&middot;&nbsp;{" "}
          <a href="/terms" className="hover:text-charcoal transition-colors">Terms</a>
          &nbsp;&middot;&nbsp;
          <a href="/privacy" className="hover:text-charcoal transition-colors">Privacy</a>
        </p>
      </footer>
    </div>
  );
}

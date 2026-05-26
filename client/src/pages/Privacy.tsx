export default function Privacy() {
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
        <span className="font-serif text-lg tracking-widest text-charcoal">MEETHA</span>
        <div className="w-12" />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">
        <div>
          <p className="font-sans text-xs tracking-[0.2em] uppercase text-gold mb-4">Legal</p>
          <h1 className="font-serif font-light text-3xl text-charcoal mb-2">Privacy Policy</h1>
          <p className="font-sans text-xs text-charcoal-soft">Effective date: May 25, 2025</p>
        </div>

        <div className="space-y-8 font-sans font-light text-sm text-charcoal-soft leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">1. Who we are</h2>
            <p>
              Meetha ("Meetha," "we," "our," or "us") is a content creation tool operated at meetha.studio. We help creators generate cinematic images, hooks, and captions tuned to their aesthetic. Questions about this policy can be sent to hello@meetha.studio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">2. What we collect</h2>
            <p>We collect only what is necessary to provide the service:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Your email address, used to send you a sign-in link and to identify your account.</li>
              <li>Your display name, if you choose to provide one.</li>
              <li>Reference images you upload during aesthetic calibration. These are used solely to analyze your visual preferences and are not shared with third parties.</li>
              <li>Generated images and captions created through the service, stored so you can access your history.</li>
              <li>Usage data such as the number of generations you have made and your current plan tier.</li>
              <li>Basic analytics data (page views, session counts) collected via Umami, a privacy-focused analytics tool that does not use cookies or track individuals across sites.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">3. How we use your data</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>To provide and improve the service.</li>
              <li>To send you sign-in links and, if you opt in, product updates.</li>
              <li>To process payments through Stripe. We do not store your payment card details.</li>
              <li>To analyze aggregate usage patterns so we can make the product better.</li>
            </ul>
            <p>We do not sell your data. We do not use your content to train AI models.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">4. Third-party services</h2>
            <p>We use the following third-party services to operate Meetha:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Supabase</strong>: authentication and database hosting.</li>
              <li><strong>Fal.ai</strong>: AI image and video generation. Your prompts are sent to Fal.ai to produce images. Fal.ai's privacy policy governs their handling of that data.</li>
              <li><strong>OpenAI</strong>: caption and hook generation. Your aesthetic profile and scene selection are sent to OpenAI to generate copy. OpenAI's privacy policy governs their handling of that data.</li>
              <li><strong>Resend</strong>: transactional email delivery.</li>
              <li><strong>Stripe</strong>: payment processing.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">5. Cookies and tracking</h2>
            <p>
              We use a single session cookie to keep you signed in. This cookie is strictly necessary for the service to function and does not track you across other websites. We do not use advertising cookies or third-party tracking pixels.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">6. Data retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you delete your account, all of your personal data, generated content, and uploaded reference images are permanently deleted within 30 days. Anonymized aggregate usage statistics may be retained indefinitely.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">7. Your rights</h2>
            <p>
              You have the right to access, correct, or delete your personal data at any time. You can delete your account and all associated data directly from your Profile settings. For any other data requests, contact us at hello@meetha.studio.
            </p>
            <p>
              If you are located in the European Economic Area or the United Kingdom, you have additional rights under GDPR including the right to data portability and the right to lodge a complaint with your local supervisory authority.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">8. Children</h2>
            <p>
              Meetha is not directed at children under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with their data, contact us at hello@meetha.studio and we will delete it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">9. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. When we do, we will update the effective date at the top and, for material changes, notify you by email. Continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg text-charcoal">10. Contact</h2>
            <p>
              For privacy questions or data requests, email us at hello@meetha.studio.
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

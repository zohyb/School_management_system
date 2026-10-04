function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-700">{children}</div>
    </section>
  );
}

export function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-ink-900">Privacy policy</h1>
      <p className="mt-2 text-sm text-ink-500">Last updated: October 1, 2026</p>

      <Section title="What we collect">
        <p>
          When a school signs up, we collect the school name, contact details, and billing
          information needed to run the subscription. Inside the product, schools store their own
          records: student and staff profiles, attendance, fee payments, and exam marks. We process
          that data only to provide the service, and we never sell it.
        </p>
      </Section>

      <Section title="How data is used">
        <ul className="list-disc space-y-2 pl-5">
          <li>To operate each school's workspace: logins, records, reports, and receipts.</li>
          <li>To bill subscriptions and send payment confirmations.</li>
          <li>To respond to support requests. We access a school's data only when asked to help, and only with permission.</li>
          <li>To keep the service secure: login attempts, error logs, and abuse detection.</li>
        </ul>
      </Section>

      <Section title="Data sharing">
        <p>
          We do not share school or student data with advertisers or data brokers. We use a small
          number of infrastructure providers (hosting, backups, email delivery) who process data
          under contract and cannot use it for their own purposes.
        </p>
      </Section>

      <Section title="Data retention and deletion">
        <p>
          Active subscriptions keep data for as long as the account exists. After cancellation,
          data remains exportable for 90 days, then is permanently deleted on request. Backups roll
          off within 30 days after that.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Schools can export all of their records at any time from the dashboard. To request a copy
          or deletion of your data, email support@sms.local and we will respond within 7 days.
        </p>
      </Section>

      <Section title="Children's data">
        <p>
          Student records belong to the school, which is responsible for having the necessary
          consent from parents or guardians to store them. We do not market to children and we do
          not use student data for advertising.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about this policy: support@sms.local</p>
      </Section>
    </div>
  );
}

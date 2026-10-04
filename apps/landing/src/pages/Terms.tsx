function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-700">{children}</div>
    </section>
  );
}

export function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-ink-900">Terms of service</h1>
      <p className="mt-2 text-sm text-ink-500">Last updated: October 1, 2026</p>

      <Section title="The service">
        <p>
          SMS provides web-based school management software on a subscription basis: student and
          staff records, attendance, fee management, exams and results, timetables, and notices.
          We may update or improve features over time and will announce changes that affect how
          schools work day to day.
        </p>
      </Section>

      <Section title="Accounts">
        <ul className="list-disc space-y-2 pl-5">
          <li>One subscription covers one school, including its branches on the Premium plan.</li>
          <li>Schools are responsible for keeping staff login credentials private and for removing access when staff leave.</li>
          <li>Accounts must be used for lawful school administration only.</li>
        </ul>
      </Section>

      <Section title="Free trial">
        <p>
          New schools get a 14-day free trial with full access. No payment details are required to
          start. If no paid plan is chosen, the workspace becomes read-only until a plan is
          selected or the trial data is deleted on request.
        </p>
      </Section>

      <Section title="Billing">
        <ul className="list-disc space-y-2 pl-5">
          <li>Plans are billed monthly or yearly in Pakistani rupees, in advance.</li>
          <li>Failed payments trigger reminders; after 14 days past due, the workspace becomes read-only until payment resumes.</li>
          <li>Cancel any time from the account page. The subscription stays active until the end of the paid period.</li>
          <li>Refunds are issued for duplicate charges and for downtime exceeding 48 consecutive hours caused by us.</li>
        </ul>
      </Section>

      <Section title="Data">
        <p>
          Schools own their data and can export it at any time. After cancellation, data stays
          exportable for 90 days. We keep daily backups and aim for 99.5% monthly availability,
          excluding scheduled maintenance announced at least 48 hours ahead.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Schools must not upload unlawful content, attempt to access other schools' data, or
          resell access to the service without written permission. We may suspend accounts that
          breach these terms after notice, except where immediate suspension is needed to protect
          the service or other customers.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          The service is provided as is. To the extent permitted by law, our liability is limited
          to the fees paid in the 12 months before a claim. We are not liable for indirect losses
          such as lost paper records that were never entered into the system.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          We will notify account owners by email at least 30 days before material changes to these
          terms. Questions: support@sms.local
        </p>
      </Section>
    </div>
  );
}

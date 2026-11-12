import React from 'react';
import { InfoPageId } from '../../types/study';
import { InfoPageLayout } from './InfoPageLayout';

interface PrivacyPolicyPageProps {
  onBack: () => void;
  onNavigateInfo: (page: InfoPageId) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack, onNavigateInfo }) => {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <InfoPageLayout currentPage="privacy" onBack={onBack} onNavigateInfo={onNavigateInfo}>
      <div className="space-y-7 text-slate-700 dark:text-slate-300">
        <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Legal
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Privacy Policy
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Last updated: {lastUpdated}
          </p>
        </header>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            1. Overview &amp; No Account Required
          </h2>
          <p className="text-sm leading-relaxed">
            Cadence (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the application&rdquo;) is a student study
            planner, day timetable builder, and Pomodoro focus timer created by <strong>Vansh Thakur</strong>.
            You do not need to create an account, log in, or submit personal registration details to use
            Cadence.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            2. Data Stored Locally on Your Device
          </h2>
          <p className="text-sm leading-relaxed">
            All study data you enter inside Cadence is stored strictly locally in your web browser on your own
            device and is not transmitted to or stored on our servers:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <li>
              <strong>Browser localStorage:</strong> Stores your tasks, custom subjects, exam dates, focus
              session logs, daily time blocks, day templates, theme preference, and timer/sound settings.
            </li>
            <li>
              <strong>Browser IndexedDB:</strong> Stores any custom alarm audio files (MP3, WAV, M4A, or OGG)
              that you choose to upload from your device.
            </li>
          </ul>
          <p className="text-sm leading-relaxed">
            Because this information remains on your device, we cannot view, access, recover, or sell your
            personal study records.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            3. Advertising &amp; Third-Party Vendors (Google AdSense)
          </h2>
          <p className="text-sm leading-relaxed">
            To keep Cadence free for students, this website may display advertisements served by third-party
            advertising partners such as Google.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <li>
              Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior
              visits to this website or other websites.
            </li>
            <li>
              Google&apos;s use of advertising cookies enables it and its partners to serve ads to users based
              on their visit to this site and/or other sites on the Internet.
            </li>
            <li>
              Users may opt out of personalized advertising by visiting{' '}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400"
              >
                Google Ads Settings (https://www.google.com/settings/ads)
              </a>
              .
            </li>
            <li>
              Alternatively, users can opt out of a third-party vendor&apos;s use of cookies for personalized
              advertising by visiting{' '}
              <a
                href="https://www.aboutads.info"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400"
              >
                https://www.aboutads.info
              </a>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            4. Cookies &amp; Browser Technologies
          </h2>
          <p className="text-sm leading-relaxed">
            Cadence itself does not set tracking cookies to profile your study habits. However, third-party
            advertising networks (such as Google AdSense) and embedded fonts or CDN resources may use cookies or
            similar browser identifiers for ad delivery, frequency capping, aggregated reporting, and fraud
            prevention. You can manage or block cookies at any time through your browser settings.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            5. Notifications &amp; Device Permissions
          </h2>
          <p className="text-sm leading-relaxed">
            If you enable desktop or mobile browser notifications, Cadence requests the browser Notification
            permission solely to alert you when a Pomodoro focus session, break, or scheduled Day Planner block
            begins or is five minutes away. Notification permissions are handled locally by your browser and can
            be revoked anytime in your browser site settings.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            6. Children&apos;s Privacy
          </h2>
          <p className="text-sm leading-relaxed">
            Cadence is not directed to children under the age of 13, and we do not knowingly collect any
            personally identifiable information from children under 13. If you are a parent or guardian and
            believe a child under 13 has shared personal information with us via email or another channel,
            please contact us so we can promptly delete it.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            7. Data Deletion &amp; Your Control
          </h2>
          <p className="text-sm leading-relaxed">
            You have complete control over your locally stored data. At any time, you can open{' '}
            <strong>Settings &gt; Data &amp; App &gt; Reset All Data</strong> to wipe your tasks, subjects,
            exams, sessions, and timetable, delete individual uploaded alarm tunes in{' '}
            <strong>Settings &gt; Sounds</strong>, or clear site storage directly through your browser&apos;s
            privacy controls.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            8. Changes to This Policy
          </h2>
          <p className="text-sm leading-relaxed">
            We may update this Privacy Policy from time to time to reflect app improvements, legal
            requirements, or advertising disclosures. Any updates will be posted on this page with a revised
            &ldquo;Last updated&rdquo; date.
          </p>
        </section>

        <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            9. Contact Details
          </h2>
          <p className="text-sm leading-relaxed">
            If you have questions about this Privacy Policy or how Cadence handles data, please contact:
          </p>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Vansh Thakur ·{' '}
            <a
              href="mailto:vanshthakur50568@gmail.com"
              className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400"
            >
              vanshthakur50568@gmail.com
            </a>
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
};

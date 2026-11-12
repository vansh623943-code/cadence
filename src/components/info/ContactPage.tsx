import React, { useState } from 'react';
import { Bug, CheckCircle2, Clock, Mail, Send, User } from 'lucide-react';
import { InfoPageId } from '../../types/study';
import { InfoPageLayout } from './InfoPageLayout';

interface ContactPageProps {
  onBack: () => void;
  onNavigateInfo: (page: InfoPageId) => void;
}

const CONTACT_EMAIL = 'vanshthakur50568@gmail.com';

export const ContactPage: React.FC<ContactPageProps> = ({ onBack, onNavigateInfo }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<'general' | 'bug' | 'feature'>('general');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submittedMailto, setSubmittedMailto] = useState('');

  const buildMailtoHref = () => {
    const topicLabel =
      topic === 'bug'
        ? 'Bug Report'
        : topic === 'feature'
        ? 'Feature Suggestion'
        : 'Cadence Inquiry';
    const subject = encodeURIComponent(`[Cadence] ${topicLabel} from ${name.trim()}`);
    const body = encodeURIComponent(
      `Name: ${name.trim()}\nEmail: ${email.trim()}\nTopic: ${topicLabel}\n\nMessage:\n${message.trim()}`
    );
    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2) {
      setError('Please enter your name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (trimmedMessage.length < 10) {
      setError('Please write a message of at least 10 characters.');
      return;
    }

    const href = buildMailtoHref();
    setSubmittedMailto(href);

    // Open user's default email app without using window.open
    const anchor = document.createElement('a');
    anchor.href = href;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <InfoPageLayout currentPage="contact" onBack={onBack} onNavigateInfo={onNavigateInfo}>
      <div className="space-y-8 text-slate-700 dark:text-slate-300">
        <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Get in Touch
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Contact Us
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
            Have a question about Cadence, spotted an issue, or want to suggest an improvement for students?
            Reach out directly below.
          </p>
        </header>

        {/* Direct Contact Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Creator</span>
            </div>
            <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Vansh Thakur
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Expected response time: within 2–3 days</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Email</span>
            </div>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="break-all font-mono text-sm font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400"
            >
              {CONTACT_EMAIL}
            </a>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Click to email directly from your preferred mail client.
            </p>
          </div>
        </div>

        {/* Report a Bug / Suggest a Feature Note */}
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <Bug className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              Report a bug / Suggest a feature:
            </strong>{' '}
            When reporting a bug, including your device type (phone or laptop), browser name, and what you
            clicked right before the issue happened helps reproduce and fix it much faster. Feature ideas from
            students are always welcome!
          </div>
        </div>

        {/* Contact Form */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Send a Message
          </h2>

          {submittedMailto && (
            <div
              role="status"
              className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Your email draft is ready!</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                Your default email app should now open with your message prefilled for{' '}
                <span className="font-mono">{CONTACT_EMAIL}</span>. We typically reply within 2–3 days.
              </p>
              <div className="pt-1">
                <a
                  href={submittedMailto}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100/60 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Open email app again</span>
                </a>
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Your Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Alex Rivera"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Your Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="contact-topic"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Topic
              </label>
              <select
                id="contact-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value as 'general' | 'bug' | 'feature')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="general">General Question / Feedback</option>
                <option value="bug">Report a Bug</option>
                <option value="feature">Suggest a Feature</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your question, bug details, or feature idea..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Submits via your device&apos;s email app (no server tracking).
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <Send className="h-4 w-4" />
                <span>Open in Email App</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </InfoPageLayout>
  );
};

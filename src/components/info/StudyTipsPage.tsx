import React from 'react';
import { InfoPageId } from '../../types/study';
import { InfoPageLayout } from './InfoPageLayout';

interface StudyTipsPageProps {
  onBack: () => void;
  onNavigateInfo: (page: InfoPageId) => void;
}

export const StudyTipsPage: React.FC<StudyTipsPageProps> = ({ onBack, onNavigateInfo }) => {
  return (
    <InfoPageLayout currentPage="study-tips" onBack={onBack} onNavigateInfo={onNavigateInfo}>
      <div className="space-y-8 text-slate-700 dark:text-slate-300">
        <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Student Playbook
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Practical Study Tips for Better Focus and Retention
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
            Studying longer rarely beats studying with structure. Use these research-backed habits alongside
            your planner and timer to retain more material with less late-night stress.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            The Pomodoro Technique explained
          </h2>
          <p className="leading-relaxed">
            The Pomodoro Technique breaks open-ended study marathons into clear, timed sprints—traditionally 25
            minutes of single-task focus followed by a 5-minute break. After completing four focus sprints, you
            take a longer 15- to 30-minute recharge break. Instead of staring at a three-hour reading list and
            procrastinating, you only have to commit to finishing one short block.
          </p>
          <p className="leading-relaxed">
            The trick is protecting the interval from context switching. Before pressing Start in Kilostudy Planner, pick
            one specific task—such as solving ten calculus problems or summarizing Chapter 4—and link that task
            to your timer. During the 5-minute break, step away from your desk, stretch, or drink water rather
            than scrolling social feeds, which pulls your brain into a different attention loop.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <li>For heavy problem solving or coding, try 45–50 minute blocks with 10-minute breaks.</li>
            <li>For memorizing flashcards or starting difficult tasks you dread, stick to 25 minutes.</li>
            <li>Log every finished sprint so you learn how many hours of deep focus you truly complete each week.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            How to make a realistic timetable
          </h2>
          <p className="leading-relaxed">
            Most student timetables fail by Tuesday because they assume you are a robot who studies eight hours
            straight without commuting, eating, or feeling tired. A realistic timetable starts with your
            non-negotiables first: classes, sleep, meals, exercise, and travel time. Only after placing those
            anchors should you fill open windows with focused study blocks.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <li>
              <strong>Leave buffer space:</strong> Schedule 15–20% empty free time each day so one slow assignment
              does not collapse your entire evening plan.
            </li>
            <li>
              <strong>Match difficulty to energy:</strong> Place your hardest analytical subject during your peak
              alert hours and save formatting notes or administrative errands for low-energy afternoons.
            </li>
            <li>
              <strong>Schedule specific actions, not vague labels:</strong> Write &ldquo;Organic Chemistry Ch. 6
              practice set&rdquo; instead of &ldquo;Study Chemistry.&rdquo;
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Active recall and spaced repetition
          </h2>
          <p className="leading-relaxed">
            Re-reading highlighted textbooks feels productive because the page looks familiar, yet familiarity is
            not mastery. <strong>Active recall</strong> forces your brain to retrieve information without looking
            at the answer—by closing the book and writing everything you remember on a blank sheet, teaching a
            concept aloud, or answering past exam questions from scratch.
          </p>
          <p className="leading-relaxed">
            Combine active recall with <strong>spaced repetition</strong>: revisit a topic shortly before you
            would naturally forget it—for example on Day 1, Day 3, Day 7, and Day 14. Three 30-minute retrieval
            sessions spread across two weeks produce dramatically stronger exam performance than one exhausting
            four-hour cramming session the night before.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            How to prepare for exams in the last 7 days
          </h2>
          <p className="leading-relaxed">
            When an exam enters the final seven-day countdown, shift from passive note-taking to diagnostic
            practice. Your goal during exam week is identifying weak spots quickly and fixing them while you
            still have time.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <li>
              <strong>Days 7–5:</strong> Audit the syllabus, list high-weight topics, and complete one timed mock
              paper or chapter quiz to expose what you actually miss under pressure.
            </li>
            <li>
              <strong>Days 4–2:</strong> Drill only your weakest topics and tricky problem types using short,
              focused blocks rather than reviewing material you already score 90% on.
            </li>
            <li>
              <strong>Final 24 hours:</strong> Review a concise one-page summary sheet of formulas or key dates,
              pack your bag early, and stop studying at least an hour before bedtime so your memory consolidates
              overnight.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Avoiding phone distraction
          </h2>
          <p className="leading-relaxed">
            Willpower alone rarely beats apps engineered to capture attention. Even having a phone face-up beside
            your notebook creates subtle cognitive drag because part of your brain monitors incoming vibrations
            or notifications.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <li>Put your phone in another room, inside your backpack, or on Do Not Disturb during focus sprints.</li>
            <li>Keep a scratchpad next to you to jot down random urges to look something up—check them only during breaks.</li>
            <li>Run Kilostudy Planner in Fullscreen Focus Mode on your laptop and close unrelated social or video tabs before starting.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Sleep and breaks matter
          </h2>
          <p className="leading-relaxed">
            Sleep is not wasted study time; it is when your brain transfers short-term facts into durable
            long-term memory. Cutting sleep from seven or eight hours down to four impairs working memory, slows
            reading comprehension, and increases careless arithmetic or essay errors the next day.
          </p>
          <p className="leading-relaxed">
            Likewise, real breaks during the day restore mental stamina. Move your body, eat regular meals, step
            into daylight, and schedule your sleep block directly inside your Day Planner so late-night studying
            has a clear stop boundary.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Building a daily study streak
          </h2>
          <p className="leading-relaxed">
            Consistency compounds faster than occasional bursts of heroic effort. Studying 50 focused minutes
            every single day builds momentum and reduces exam anxiety far better than ignoring coursework all week
            and panicking on Sunday night.
          </p>
          <p className="leading-relaxed">
            To protect your streak on busy or exhausting days, lower the minimum bar instead of skipping entirely:
            even one 15- or 25-minute Pomodoro session keeps the habit alive. Watch your weekly chart and heatmap
            grow over time—once the chain becomes visible, showing up tomorrow becomes automatic.
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
};

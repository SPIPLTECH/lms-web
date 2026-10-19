import { BookOpen, Users, Sparkles, Calendar } from "lucide-react";

// Builds the News & Updates feed: curated platform/course/batch items plus
// any live calendar events merged in as batch-schedule updates. Isolated
// from the page so News page.jsx stays focused on filtering/pagination/
// rendering rather than what the feed contains.
export function buildNewsFeed({ enrolledCourses = [], calendarEvents = [] }) {
  const now = new Date();
  const todayFormatted = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const makeDate = (daysAgo, hours, minutes) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const feed = [
    {
      id: "news-1",
      category: "COURSE",
      categoryLabel: "Course Update",
      title: "New Module Added: Advanced Microservices with Spring Cloud",
      summary: "We have released 4 new video lessons and 2 practical lab assignments for the Spring Boot & Microservices module.",
      content: "We are excited to announce a major course update! The 'Advanced Microservices with Spring Cloud' module is now live in your enrolled Java Full Stack curriculum. It covers API Gateways, Eureka Service Discovery, and Resilience4j Fault Tolerance with hands-on code labs.",
      timestamp: `${todayFormatted} • 09:30 AM`,
      date: makeDate(0, 9, 30),
      badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      courseTag: enrolledCourses[0]?.course?.title || "Java Full Stack LR-01",
      actionLink: enrolledCourses[0] ? `/student/learn/${enrolledCourses[0].courseId}` : "/student/my-courses",
      actionLabel: "Start New Module",
      icon: BookOpen,
    },
    {
      id: "news-3",
      category: "PLATFORM",
      categoryLabel: "Platform News",
      title: "Interactive AI Quiz Generator & Performance Analytics 2.0",
      summary: "Students can now generate custom practice quizzes by topic and track detailed speed metrics.",
      content: "Orange Tree LMS has launched Self-Generate Quiz feature! You can now select any category or difficulty level to test your knowledge with instant AI feedback, detailed answer explanations, and automated progress reports.",
      timestamp: "Yesterday • 04:15 PM",
      date: makeDate(1, 16, 15),
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      courseTag: "New Platform Feature",
      actionLink: "/student/quizzes",
      actionLabel: "Try Self Quiz",
      icon: Sparkles,
    },
    {
      id: "news-4",
      category: "COURSE",
      categoryLabel: "Course Update",
      title: "React 19 & Next.js App Router Masterclass Content Refreshed",
      summary: "Updated code repositories, React Server Components exercises, and Turbopack build guidelines.",
      content: "All source code examples in the Frontend Architecture section have been updated to support React 19 and Next.js 16 Edge runtime patterns. Re-download project resources from your course lesson view.",
      timestamp: "2 days ago",
      date: makeDate(2, 12, 0),
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      courseTag: "Frontend Engineering",
      actionLink: "/student/my-courses",
      actionLabel: "View Course Assets",
      icon: BookOpen,
    },
    {
      id: "news-5",
      category: "BATCH",
      categoryLabel: "Batch Alert",
      title: "Upcoming Project Review Deadline & Mock Interview Drive",
      summary: "The capstone submission deadline is approaching. Placement mock interviews start next week.",
      content: "Please ensure your capstone assignments are submitted prior to the upcoming Sunday midnight deadline. Mock technical interviews with industry mentors will begin next Monday. Check your calendar for individual interview slots.",
      timestamp: "3 days ago",
      date: makeDate(3, 12, 0),
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      courseTag: "Placement Drive",
      actionLink: "/student/assignments",
      actionLabel: "Check Assignments",
      icon: Users,
    },
  ];

  // Inject any live calendar events as daily batch updates
  if (calendarEvents && calendarEvents.length > 0) {
    calendarEvents.slice(0, 2).forEach((event, idx) => {
      const parsedDate = new Date(event.date);
      feed.push({
        id: `cal-news-${idx}`,
        category: "BATCH",
        categoryLabel: "Batch Schedule",
        title: `Upcoming Scheduled Session: ${event.title}`,
        summary: `Scheduled event on ${event.date} (${event.startTime || "All Day"}). ${event.courseName || "Course Schedule"}.`,
        content: `Your batch has a scheduled session '${event.title}' on ${event.date} starting at ${event.startTime || "the specified time"}. Make sure to join on time!`,
        timestamp: `Scheduled for ${event.date}`,
        date: Number.isNaN(parsedDate.getTime()) ? now : parsedDate,
        badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        courseTag: event.courseName || "Scheduled Event",
        actionLink: "/student/my-courses",
        actionLabel: "Open My Courses",
        icon: Calendar,
      });
    });
  }

  return feed;
}

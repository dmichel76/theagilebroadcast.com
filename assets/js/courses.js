/*
  Training courses shown on the homepage.

  To add a course, copy one block below, paste it at the end of the list
  and change the text. Fields:

    title        Course name
    audience     Who it is for (short)
    status       "available" or "in-development"
    summary      One or two sentences
    slides       Optional list of slide images from the course. They are shown as a deck
                 that shuffles every few seconds (click/tap to shuffle too).
    pillars      Optional, e.g. ["Value", "Flow", "Learning"], shown as coloured tags
    outcomes     List of things people will be able to do afterwards (can be empty: []).
                 Each item is either plain text or { text: "...", pillar: "value" | "flow" | "learning" }
                 to colour-code it
    formats      List of ways it can be run (can be empty: [])
    testimonial  null, or { quote: "...", name: "...", role: "..." }
    hidden       Optional. true keeps the course in this file but off the site
*/
window.COURSES = [
  {
    title: "Agility with Flow & Value",
    audience: "For teams",
    status: "available",
    summary:
      "How do we move from idea to value to learning as quickly and reliably as possible? This is not a Scrum course. It goes beneath the frameworks to the principles that make any of them work, so it fits whether you use Scrum, Kanban, SAFe or something of your own.",
    pillars: ["Value", "Flow", "Learning"],
    slides: [
      "assets/img/training-slide-outcome.jpg",
      "assets/img/training-slide-miro.jpg",
      "assets/img/training-slide-fidelity.jpg",
      "assets/img/training-slide-blocked.jpg",
      "assets/img/training-slide-wip.jpg",
      "assets/img/training-slide-assessment.jpg",
      "assets/img/training-slide-paths.jpg"
    ],
    outcomes: [
      { text: "Check whether work is addressing the right problem, and break it down to deliver value earlier", pillar: "value" },
      { text: "Recognise what helps or hinders the flow of work", pillar: "flow" },
      { text: "Tell whether delivered work created real value, reduce uncertainty and learn sooner", pillar: "learning" }
    ],
    formats: [
      "Full day, up to 20 people, highly interactive",
      "Face-to-face or online (not hybrid)",
      "Optional self-assessment afterwards, with a summary of strengths and opportunities across teams"
    ],
    testimonial: null
  },
  {
    title: "Leading for Value and Flow",
    audience: "For leaders and managers",
    status: "in-development",
    summary:
      "A course for the people who shape the system teams work in: setting outcomes, managing flow rather than people, and creating room to learn.",
    outcomes: [],
    formats: [],
    testimonial: null
  },
  {
    title: "Slicing Work by Value",
    hidden: true,
    audience: "For teams · Advanced",
    status: "in-development",
    summary:
      "How you break work down decides how soon you deliver value and how soon you learn. Slicing by value, rather than by task or component, is one of the most important keys to unlocking agility, and a central theme of my book. This is an advanced course: we recommend starting with Agility with Flow & Value.",
    outcomes: [],
    formats: [],
    testimonial: null
  },
  {
    title: "Flow Metrics",
    hidden: true,
    audience: "For teams and leaders",
    status: "in-development",
    summary:
      "Cycle time, throughput, work in progress and work item age: what they tell you about how work really flows, how to read them without gaming them, and how to use them to forecast and to decide where to improve next.",
    pillars: ["Flow"],
    outcomes: [],
    formats: [],
    testimonial: null
  },
  {
    title: "Ways of Working with AI",
    hidden: true,
    audience: "For individuals, teams and organisations",
    status: "in-development",
    summary:
      "How AI is reshaping the way we work at every level: for individuals, for teams and across the organisation. We look at how AI changes ways of working and team structures, and how to use it to become more agile than ever before.",
    outcomes: [],
    formats: [],
    testimonial: null
  }
];

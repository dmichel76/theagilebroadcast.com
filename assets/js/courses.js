/*
  Training courses shown on the homepage.

  To add a course, copy one block below, paste it at the end of the list
  and change the text. Fields:

    title        Course name
    audience     Who it is for (short)
    status       "available" or "in-development"
    summary      One or two sentences
    outcomes     List of things people will be able to do afterwards (can be empty: [])
    formats      List of ways it can be run (can be empty: [])
    testimonial  null, or { quote: "...", name: "...", role: "..." }
*/
window.COURSES = [
  {
    title: "Agility with Flow & Value",
    audience: "For teams",
    status: "available",
    summary:
      "How do we move from idea to value to learning as quickly and reliably as possible? This is not a Scrum course. It goes beneath the frameworks to the principles that make any of them work, so it fits whether you use Scrum, Kanban, SAFe or something of your own.",
    outcomes: [
      "Evaluate whether a piece of work is addressing the right problem",
      "Break work down in ways that deliver value earlier",
      "Tell whether delivered work has created real value",
      "Reduce uncertainty and learn sooner",
      "Recognise what helps or hinders the flow of work"
    ],
    formats: [
      "Full day, up to 20 people, highly interactive",
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
    title: "Agility in the Age of AI",
    audience: "For teams and leaders",
    status: "in-development",
    summary:
      "AI makes building faster, but it doesn't tell you what's worth building. This course looks at how teams can use AI across discovery, delivery and learning to create more value, not just more output.",
    outcomes: [],
    formats: [],
    testimonial: null
  }
];

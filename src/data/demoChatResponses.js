export const initialMessages = [
  {
    id: 1,
    sender: 'bot',
    text: "Hello! 👋 I'm the BotFlow AI assistant. Ask me anything about building chatbots, uploading docs, website integration, or pricing!",
    time: "Just now",
    suggestions: [
      "How do I create a chatbot?",
      "Can I upload PDF documents?",
      "How does website integration work?",
      "Tell me about pricing plans"
    ]
  }
];

export const getBotResponse = (userQuery) => {
  const query = userQuery.toLowerCase().trim();

  if (query.includes('create') || query.includes('how to start') || query.includes('build') || query.includes('make a bot')) {
    return {
      text: "Creating a bot takes under 2 minutes! 🚀\n1. Sign up for free.\n2. Upload your documents (PDF, DOCX) or enter your website URL.\n3. Customize your bot's name, tone, and brand colors.\n4. Copy the 1-line script tag and paste it before `</body>` on your site!",
      followUps: ["Can I upload PDF documents?", "Show me integration code", "What pricing plans exist?"]
    };
  }

  if (query.includes('pdf') || query.includes('doc') || query.includes('file') || query.includes('upload') || query.includes('knowledge')) {
    return {
      text: "Yes, absolutely! 📄 BotFlow AI supports PDF, Word docs (.docx), CSV, TXT, and raw URLs. Our semantic engine parses and indexes your documents into secure vector embeddings so your bot only answers with verified data.",
      followUps: ["How often does it sync?", "Is my data secure?", "How do I embed it?"]
    };
  }

  if (query.includes('embed') || query.includes('integrat') || query.includes('code') || query.includes('website') || query.includes('script')) {
    return {
      text: "Integration is as simple as adding one line to your website:\n\n`<script src=\"https://cdn.botflow.ai/v1/widget.js\" data-bot-id=\"bf_948a2\" async></script>`\n\nIt works seamlessly with WordPress, Shopify, React, Next.js, Webflow, Squarespace, and plain HTML!",
      followUps: ["Does it slow down my website?", "Can I customize the look?"]
    };
  }

  if (query.includes('price') || query.includes('plan') || query.includes('cost') || query.includes('free') || query.includes('subscription')) {
    return {
      text: "We offer 3 simple tiers:\n• **Free**: 1 chatbot, 100 messages/mo, 10MB doc storage\n• **Pro ($29/mo)**: 3 chatbots, 2,000 messages/mo, custom branding\n• **Business ($99/mo)**: Unlimited chatbots, 15,000 messages/mo, API access & human handover.\n\nCheck out the Pricing section on this page!",
      followUps: ["Is there a free trial?", "Can I change plans anytime?"]
    };
  }

  if (query.includes('hospital') || query.includes('health') || query.includes('doctor') || query.includes('clinic')) {
    return {
      text: "Hospitals and clinics use BotFlow AI to answer 24/7 patient FAQs, provide OPD timings, specialist directory lookups, and prep instructions for tests without tying up phone operators.",
      followUps: ["Can it book appointments?", "Is it HIPAA compliant?"]
    };
  }

  if (query.includes('college') || query.includes('university') || query.includes('school') || query.includes('student')) {
    return {
      text: "Colleges and universities deploy BotFlow AI to guide prospective students through admissions, fee deadlines, campus tours, syllabus downloads, and hostel regulations instantly.",
      followUps: ["Can it handle multiple departments?", "Can students use it on mobile?"]
    };
  }

  if (query.includes('restaurant') || query.includes('food') || query.includes('menu') || query.includes('cafe')) {
    return {
      text: "Restaurants love BotFlow AI! Guests can view today's specials, ask about allergens/dietary restrictions, find parking info, and request table reservations around the clock.",
      followUps: ["Can it show image menus?", "How to add to Instagram/site?"]
    };
  }

  if (query.includes('human') || query.includes('agent') || query.includes('handover') || query.includes('live support')) {
    return {
      text: "When a conversation requires human nuance, BotFlow AI can seamlessly route the chat to your support inbox, Slack, or Zendesk with complete conversation transcripts.",
      followUps: ["What integrations exist?", "How fast does it alert me?"]
    };
  }

  if (query.includes('hi') || query.includes('hello') || query.includes('hey')) {
    return {
      text: "Hello! 😊 Great to have you here. What kind of business or website are you building an AI chatbot for?",
      followUps: ["E-commerce store", "College / University", "Hospital / Clinic", "Restaurant / Cafe", "SaaS / Tech Startup"]
    };
  }

  // Fallback
  return {
    text: "Thanks for asking! BotFlow AI lets you train custom conversational AI on your business data and deploy it anywhere in under 5 minutes. Feel free to explore our features, test the dashboard preview, or ask about specific use cases!",
    followUps: ["How do I create a chatbot?", "Can I upload PDF documents?", "Show me pricing plans"]
  };
};

export interface Industry {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  heroHeadline: string;
  heroSub: string;
  color: string;           // tailwind bg color for icon/accent
  colorHex: string;        // raw hex for SVG strokes
  emoji: string;
  stats: Array<{ val: string; label: string }>;
  painPoints: Array<{ title: string; desc: string }>;
  useCases: Array<{ title: string; desc: string; icon: string }>;
  kpis: string[];
  integrations: string[];
  quote: { text: string; author: string; role: string };
}

export const industries: Industry[] = [
  // 1 ─ E-commerce / DTC
  {
    slug: 'ecommerce',
    name: 'E-commerce & DTC',
    shortName: 'E-commerce',
    tagline: 'Grow revenue per visitor, not just traffic.',
    heroHeadline: 'The AI CMO built for\ne-commerce brands.',
    heroSub: 'Stop guessing which SKU to promote, which audience to scale, and which creative to cut. TablePilot AI reads your Shopify, ad accounts, and email flows — and tells you exactly what to do next.',
    color: 'bg-orange-500',
    colorHex: '#f97316',
    emoji: '🛒',
    stats: [
      { val: '+34%', label: 'avg. ROAS improvement' },
      { val: '−28%', label: 'CAC reduction in 90 days' },
      { val: '3.1×', label: 'email click-to-purchase rate' },
      { val: '6 hrs', label: 'saved per week on reporting' },
    ],
    painPoints: [
      { title: 'ROAS is a vanity metric without context', desc: 'Your ad dashboard shows numbers but not meaning. SKU-level profitability, LTV, and return rate aren\'t visible until it\'s too late.' },
      { title: 'Creative fatigue kills scale', desc: 'Your best ad set starts declining and you find out three days later. By then you\'ve burned budget on dead creative.' },
      { title: 'Email is an afterthought', desc: 'Klaviyo sends the flows you set up 18 months ago. Nobody has time to rewrite them. Revenue leaks out of every abandoned cart sequence.' },
    ],
    useCases: [
      { title: 'SKU-level performance analysis', desc: 'Ask "Which 20% of products drive 80% of margin?" and get a ranked breakdown with reorder and promotion recommendations in seconds.', icon: '📊' },
      { title: 'Creative brief generation', desc: 'Describe the product, audience, and season — get 5 ad copy variants + image prompts ready for Meta and Google.', icon: '🎨' },
      { title: 'Email sequence rewrite', desc: 'Paste your abandon-cart stats. Get a rewritten 3-email sequence with subject lines, copy, and send-time recommendations.', icon: '✉️' },
      { title: 'Seasonal campaign planning', desc: 'Input your BFCM targets. Get a 30-day channel plan with budget splits, creative calendar, and daily KPI checkpoints.', icon: '📅' },
    ],
    kpis: ['ROAS', 'CPA', 'Add-to-Cart Rate', 'Cart Abandonment', 'Email Revenue/Recipient', 'LTV:CAC Ratio', 'Return Rate', 'Contribution Margin'],
    integrations: ['Shopify', 'Meta Ads', 'Google Ads', 'Klaviyo', 'GA4', 'Stripe', 'TikTok Ads', 'Pinterest Ads'],
    quote: { text: 'We replaced our agency retainer in week 3. The AI caught a creative fatigue problem our team missed for two weeks — saved us about $8K in wasted spend.', author: 'Alex D.', role: 'Founder, DTC Skincare Brand' },
  },

  // 2 ─ SaaS / B2B
  {
    slug: 'saas',
    name: 'B2B SaaS',
    shortName: 'SaaS',
    tagline: 'Compress time-to-revenue. Expand NRR.',
    heroHeadline: 'The AI CMO built for\nB2B SaaS growth teams.',
    heroSub: 'Pipeline, activation, and expansion — all in one brain. TablePilot AI connects your CRM, paid channels, and product data to give your team the strategic clarity of a seasoned CMO without the headcount.',
    color: 'bg-blue-600',
    colorHex: '#2563eb',
    emoji: '⚡',
    stats: [
      { val: '+41%', label: 'MQL-to-SQL conversion rate' },
      { val: '−35%', label: 'CAC vs. agency-managed campaigns' },
      { val: '2.8×', label: 'pipeline velocity improvement' },
      { val: '18 hrs', label: 'saved monthly on board decks' },
    ],
    painPoints: [
      { title: 'Attribution is always disputed', desc: 'Sales says marketing leads don\'t close. Marketing says sales doesn\'t follow up fast enough. Neither side has a single source of truth.' },
      { title: 'Content takes forever to produce ROI', desc: 'The blog post took 3 weeks to write, 2 weeks to rank, and nobody knows if it ever sourced a deal. Your content machine has no feedback loop.' },
      { title: 'PLG and sales-led motions aren\'t coordinated', desc: 'Free users get generic drip emails. PQL triggers aren\'t wired to sales. Expansion revenue is left to chance.' },
    ],
    useCases: [
      { title: 'Full-funnel attribution report', desc: 'Ask "Which channels are sourcing revenue, not just leads?" Get a multi-touch model across organic, paid, content, and outbound in 30 seconds.', icon: '🔗' },
      { title: 'ICP refinement', desc: 'Feed it your won/lost data and CRM fields. Get a precision ICP definition with firmographic, technographic, and behavioral signals.', icon: '🎯' },
      { title: 'PQL-to-close playbook', desc: 'Describe your product signals. Get a triggered outreach sequence for sales — with personalised opening lines per company profile.', icon: '📋' },
      { title: 'Board deck narrative', desc: 'Input your key metrics. Get a concise growth narrative with slide structure, key talking points, and the 3 decisions you need from the board.', icon: '📈' },
    ],
    kpis: ['MQL/SQL Ratio', 'CAC', 'LTV:CAC', 'Time-to-Close', 'NRR', 'Churn Rate', 'Activation Rate', 'Pipeline Coverage'],
    integrations: ['HubSpot', 'Salesforce', 'Google Ads', 'LinkedIn Ads', 'GA4', 'Segment', 'Intercom', 'PostHog'],
    quote: { text: 'Our first board deck built with TablePilot AI took 45 minutes instead of two days. The narrative structure it suggested was better than what we\'d written manually.', author: 'Jordan P.', role: 'CMO, Series A SaaS' },
  },

  // 3 ─ Fintech
  {
    slug: 'fintech',
    name: 'Fintech',
    shortName: 'Fintech',
    tagline: 'Acquire compliant. Retain loyal. Scale fast.',
    heroHeadline: 'The AI CMO built for\nfintech growth teams.',
    heroSub: 'Compliance-aware marketing at the speed of fintech. TablePilot AI generates copy that checks FCA/SEC guardrails, tracks activation funnels, and allocates budget across channels — without a legal review bottleneck.',
    color: 'bg-emerald-600',
    colorHex: '#059669',
    emoji: '💳',
    stats: [
      { val: '+52%', label: 'user activation rate improvement' },
      { val: '−40%', label: 'time to compliance-cleared copy' },
      { val: '3.4×', label: 'referral programme conversion' },
      { val: '91%', label: 'reduction in reporting prep time' },
    ],
    painPoints: [
      { title: 'Compliance slows every campaign by weeks', desc: 'Legal review is a bottleneck on every piece of creative. By the time it\'s approved, the market moment has passed.' },
      { title: 'Activation is measured too late', desc: 'You know users signed up. You don\'t know when they funded, transacted, or became active — and your messaging doesn\'t reflect that journey.' },
      { title: 'Trust is hard to build at scale', desc: 'Fintech users are sceptical. Generic ad copy doesn\'t convert. Personalisation at scale requires AI you haven\'t deployed yet.' },
    ],
    useCases: [
      { title: 'Compliance-aware copy generation', desc: 'Input your jurisdiction and product type. Get marketing copy with built-in disclaimers, risk warnings, and a plain-English regulatory checklist.', icon: '⚖️' },
      { title: 'Activation funnel analysis', desc: 'Map your onboarding steps. Get a drop-off analysis with specific friction points and tested messaging fixes for each stage.', icon: '🔄' },
      { title: 'Referral programme design', desc: 'Ask for a referral mechanic for your product. Get a full programme design: incentive structure, email copy, T&Cs, and tracking plan.', icon: '🤝' },
      { title: 'Regulatory change briefing', desc: 'Input a regulatory update. Get a plain-English brief on what changes, which campaigns need updating, and a prioritised action list.', icon: '📜' },
    ],
    kpis: ['Activation Rate', 'Funded Accounts', 'CAC by Channel', 'Regulatory Breach Risk', 'Referral Rate', 'AUM Growth', 'Churn', 'NPS'],
    integrations: ['Segment', 'Braze', 'Stripe', 'Google Ads', 'Meta Ads', 'Mixpanel', 'Salesforce', 'Intercom'],
    quote: { text: 'Getting compliant ad copy used to take 2 weeks. Now we brief the AI, it adds the disclaimers automatically, and we\'re live in hours. Game-changing.', author: 'Nadia R.', role: 'Growth Lead, Neobank' },
  },

  // 4 ─ iGaming
  {
    slug: 'igaming',
    name: 'iGaming & Betting',
    shortName: 'iGaming',
    tagline: 'Acquire responsibly. Retain profitably.',
    heroHeadline: 'The AI CMO built for\niGaming operators.',
    heroSub: 'Player acquisition, bonus strategy, responsible gambling compliance, and affiliate performance — all in one AI brain. Stop flying blind on GGR attribution and start making data-driven player value decisions.',
    color: 'bg-violet-600',
    colorHex: '#7c3aed',
    emoji: '🎰',
    stats: [
      { val: '+38%', label: 'FTD-to-active player rate' },
      { val: '−25%', label: 'CPA on acquisition campaigns' },
      { val: '2.1×', label: 'LTV of AI-targeted cohorts' },
      { val: '+60%', label: 'affiliate ROI visibility' },
    ],
    painPoints: [
      { title: 'Affiliate traffic quality is a black box', desc: 'You\'re paying CPA deals but have no way to quickly rank affiliate quality by GGR, churn, and deposit velocity without a manual data pull.' },
      { title: 'Bonus costs erode margin invisibly', desc: 'Welcome bonuses look cheap on the surface. The real cost emerges in wagering patterns, withdrawal rates, and bonus abuse you\'re not tracking in real time.' },
      { title: 'Responsible gambling adds complexity', desc: 'UKGC, MGA, and regional responsible gambling requirements create compliance pressure that slows every marketing campaign.' },
    ],
    useCases: [
      { title: 'Affiliate ranking & optimisation', desc: 'Input your affiliate data. Get a ranked table by GGR contribution, churn rate, and deposit velocity — with reallocation recommendations.', icon: '📊' },
      { title: 'Bonus ROI modelling', desc: 'Describe your current bonus structure. Get a projection of true cost per bonus type, recommended wagering requirements, and a higher-margin alternative structure.', icon: '🎁' },
      { title: 'Player segment messaging', desc: 'Define a player cohort (e.g., high-value dormant). Get a personalised reactivation campaign with compliance-checked messaging for each regulatory zone.', icon: '✉️' },
      { title: 'Responsible gambling content', desc: 'Ask for responsible gambling messaging for a campaign. Get compliant copy, self-exclusion reminder flows, and betting limit suggestion scripts.', icon: '🛡️' },
    ],
    kpis: ['GGR', 'NGR', 'CPA', 'LTV', 'FTD Rate', 'Churn', 'Bonus Cost %', 'Affiliate ROI'],
    integrations: ['Google Ads', 'Meta Ads', 'Affiliate platforms', 'Segment', 'Braze', 'GA4', 'Klaviyo', 'Stripe'],
    quote: { text: 'The affiliate analysis alone saved us €40K in the first month. We had three underperforming partners we\'d never have spotted without this level of breakout.', author: 'Marco V.', role: 'Head of Marketing, Sports Betting Operator' },
  },

  // 5 ─ Healthcare / MedTech
  {
    slug: 'healthtech',
    name: 'Health & MedTech',
    shortName: 'HealthTech',
    tagline: 'Educate patients. Convert HCPs. Grow responsibly.',
    heroHeadline: 'The AI CMO built for\nhealth and MedTech teams.',
    heroSub: 'HIPAA-aware marketing strategy, HCP outreach campaigns, and patient education content — generated at the speed your clinical teams move. Build trust at scale without sacrificing compliance.',
    color: 'bg-teal-600',
    colorHex: '#0d9488',
    emoji: '🏥',
    stats: [
      { val: '+45%', label: 'HCP engagement rate' },
      { val: '−30%', label: 'time to patient education content' },
      { val: '2.6×', label: 'referral programme ROI' },
      { val: '100%', label: 'HIPAA-compliant outputs' },
    ],
    painPoints: [
      { title: 'Compliance makes content painfully slow', desc: 'Every patient-facing piece needs IRB review, legal sign-off, and medical accuracy checks. The content calendar grinds to a halt.' },
      { title: 'HCP outreach lacks personalisation', desc: 'Mass emails to physicians get 8% open rates. Personalised outreach that speaks to specialty, clinical context, and practice size converts — but takes hours per contact.' },
      { title: 'Patient acquisition is misattributed', desc: 'You don\'t know which content pieces or channels actually convert to booked appointments or product trials without deep analytics work.' },
    ],
    useCases: [
      { title: 'Patient education content', desc: 'Input diagnosis area and reading level target. Get plain-English educational content, FAQs, and email nurture sequences ready for compliance review.', icon: '📚' },
      { title: 'HCP outreach personalisation', desc: 'Input a specialty and clinical indication. Get a personalised outreach sequence addressing their specific patient population and workflow.', icon: '👨‍⚕️' },
      { title: 'Trial recruitment campaign', desc: 'Define your inclusion criteria. Get a recruitment campaign brief with channel mix, targeting parameters, and screener question sequence.', icon: '🔬' },
      { title: 'Regulatory copy audit', desc: 'Paste any marketing asset. Get a flagged list of potential HIPAA, FDA, or CE mark compliance issues with suggested rewrites.', icon: '✅' },
    ],
    kpis: ['HCP Engagement', 'Patient Acquisition Cost', 'Appointment Rate', 'Content Compliance Score', 'Trial Recruitment Rate', 'NPS', 'Referral Rate'],
    integrations: ['Salesforce Health Cloud', 'HubSpot', 'Mailchimp', 'Google Ads', 'LinkedIn Ads', 'Segment', 'Mixpanel'],
    quote: { text: 'Our patient education content used to take 3 weeks from brief to approval. Now we generate a first draft in 20 minutes and focus the team on the compliance review only.', author: 'Dr. Sarah L.', role: 'Marketing Director, Digital Health Platform' },
  },

  // 6 ─ Real Estate / PropTech
  {
    slug: 'proptech',
    name: 'Real Estate & PropTech',
    shortName: 'PropTech',
    tagline: 'List smarter. Convert faster. Close more.',
    heroHeadline: 'The AI CMO built for\nproperty and PropTech teams.',
    heroSub: 'Listing copy, lead nurture sequences, agent performance analysis, and market report generation — all from one AI brain. Stop spending half your day on content and start spending it on clients.',
    color: 'bg-amber-600',
    colorHex: '#d97706',
    emoji: '🏡',
    stats: [
      { val: '+29%', label: 'listing enquiry rate' },
      { val: '−42%', label: 'time on listing copy production' },
      { val: '3.2×', label: 'lead nurture email engagement' },
      { val: '+18%', label: 'agent close rate with AI briefing' },
    ],
    painPoints: [
      { title: 'Listing copy is a commodity', desc: 'Every agency uses the same adjectives. "Stunning", "immaculate", "rarely available." Buyers skip the description and go straight to the photos.' },
      { title: 'Leads go cold between viewings', desc: 'A buyer views on Saturday. By Wednesday they\'ve looked at 12 more properties. Your follow-up email is still sitting in drafts.' },
      { title: 'Market reports are weeks of work', desc: 'Quarterly market reports take a researcher days to compile and a copywriter a week to write. By the time they\'re published, the data is old.' },
    ],
    useCases: [
      { title: 'Listing copy generation', desc: 'Input property specs, location, and buyer persona. Get a compelling multi-channel listing: portal copy, email blast, and social caption — in 60 seconds.', icon: '✍️' },
      { title: 'Lead nurture sequences', desc: 'Input buyer stage and property type interest. Get a 5-email drip sequence that answers their next questions before they ask them.', icon: '📬' },
      { title: 'Market intelligence brief', desc: 'Input a postcode or suburb. Get a formatted market brief covering price movements, days-on-market, and competitive supply — ready to send to your client list.', icon: '📊' },
      { title: 'Off-plan campaign planning', desc: 'Describe your development. Get a pre-launch to completion marketing plan with channel budget allocation, campaign calendar, and incentive sequencing.', icon: '🏗️' },
    ],
    kpis: ['Listing Enquiry Rate', 'Days on Market', 'Lead-to-Viewing Rate', 'Viewing-to-Offer Rate', 'Portal CTR', 'Email Open Rate', 'Agent Revenue/Listing'],
    integrations: ['HubSpot', 'Salesforce', 'Mailchimp', 'Google Ads', 'Meta Ads', 'LinkedIn Ads', 'GA4'],
    quote: { text: 'We generate listing copy for every new instruction in minutes now. The quality is better than what our in-house writer was producing — and she now focuses on strategy instead.', author: 'Tom W.', role: 'Marketing Director, Residential Agency Group' },
  },

  // 7 ─ EdTech
  {
    slug: 'edtech',
    name: 'EdTech & Online Education',
    shortName: 'EdTech',
    tagline: 'Enrol more students. Improve completion. Grow sustainably.',
    heroHeadline: 'The AI CMO built for\nEdTech and online learning.',
    heroSub: 'Student acquisition, course completion campaigns, and alumni reactivation — driven by the same AI brain. Stop relying on expensive PPC alone and build a marketing engine that compounds with every cohort.',
    color: 'bg-indigo-600',
    colorHex: '#4f46e5',
    emoji: '🎓',
    stats: [
      { val: '+48%', label: 'course enrolment conversion rate' },
      { val: '−33%', label: 'cost per enrolled student' },
      { val: '2.9×', label: 'completion rate with nurture sequences' },
      { val: '+55%', label: 'alumni upsell revenue' },
    ],
    painPoints: [
      { title: 'Course pages convert badly', desc: 'Students land on your course page, read the curriculum, and leave. The page doesn\'t address their real objection: "Will this actually help my career?"' },
      { title: 'Completion rates are embarrassingly low', desc: 'Most EdTech products see sub-30% completion rates. Every drop-off is a refund risk, a bad review, and a lost upsell opportunity.' },
      { title: 'Alumni are an untapped channel', desc: 'Your best marketing asset is your alumni base. Most EdTech companies send them one annual newsletter and wonder why they don\'t buy again.' },
    ],
    useCases: [
      { title: 'Course page conversion rewrite', desc: 'Input your current course page. Get a conversion-optimised rewrite that leads with career outcomes, social proof, and objection handling.', icon: '📝' },
      { title: 'Completion nurture campaign', desc: 'Input your course structure. Get a triggered email + push sequence for every at-risk completion point — personalised by progress and persona.', icon: '🎯' },
      { title: 'Student persona research', desc: 'Describe your subject area. Get 3 detailed student personas with motivations, objections, channel preferences, and the message that converts each.', icon: '👥' },
      { title: 'Alumni reactivation campaign', desc: 'Input your alumni database segments. Get a tiered reactivation campaign with certification upgrade paths, community offers, and referral incentives.', icon: '🔄' },
    ],
    kpis: ['Enrolment Rate', 'CPA (Student)', 'Completion Rate', 'Refund Rate', 'NPS', 'Upsell Rate', 'Alumni Engagement', 'Course Revenue'],
    integrations: ['HubSpot', 'Mailchimp', 'Google Ads', 'Meta Ads', 'GA4', 'Segment', 'Intercom', 'Stripe'],
    quote: { text: 'Our completion rate went from 24% to 61% after we implemented the AI-designed nurture sequences. That\'s the single biggest impact on our business model we\'ve seen in 5 years.', author: 'Lisa K.', role: 'CEO, Online Skills Platform' },
  },

  // 8 ─ Marketing Agency
  {
    slug: 'agency',
    name: 'Marketing Agency',
    shortName: 'Agency',
    tagline: 'Deliver more. Pitch sharper. Retain longer.',
    heroHeadline: 'The AI CMO built for\nmarketing agencies.',
    heroSub: 'Manage 10 client campaigns with the insights of 100 analysts. TablePilot AI generates pitch decks, campaign reports, creative briefs, and strategic recommendations — so your team spends time on strategy, not slides.',
    color: 'bg-rose-600',
    colorHex: '#e11d48',
    emoji: '🏢',
    stats: [
      { val: '4×', label: 'more clients per strategist' },
      { val: '−70%', label: 'time on client reporting' },
      { val: '+28%', label: 'pitch win rate with AI decks' },
      { val: '92%', label: 'client retention after AI onboarding' },
    ],
    painPoints: [
      { title: 'Client reporting kills billable hours', desc: 'Your best strategists spend Fridays pulling data and formatting slides instead of thinking. Every hour on a report is an hour not billed for strategy.' },
      { title: 'New business pitches are resource-heavy', desc: 'A pitch takes 3 days of research, 2 days of deck building, and 1 day of prep. You win 1 in 3. The maths don\'t work at agency scale.' },
      { title: 'Cross-client insights don\'t compound', desc: 'What you learn on client A\'s campaign never reaches client B\'s strategy. Every engagement starts from scratch.' },
    ],
    useCases: [
      { title: 'Client performance report', desc: 'Input the client\'s KPIs and last month\'s data. Get a formatted insight report with top wins, issues, next steps, and recommended budget adjustments.', icon: '📊' },
      { title: 'New business pitch deck', desc: 'Input the prospect\'s industry, size, and known challenges. Get a positioning narrative, 3 strategic recommendations, and a differentiated approach section.', icon: '🎤' },
      { title: 'Creative brief generation', desc: 'Input campaign objectives and brand guidelines. Get a structured creative brief with audience insights, messaging hierarchy, and channel-specific formats.', icon: '✍️' },
      { title: 'Competitive landscape scan', desc: 'Input a client\'s competitors. Get a detailed breakdown of their positioning, messaging, channel mix, and the gaps your client can exploit.', icon: '🔍' },
    ],
    kpis: ['Utilisation Rate', 'Billable Hours', 'Client Retention', 'NPS', 'Pitch Win Rate', 'Revenue/Employee', 'Client ROAS', 'Campaign Efficiency'],
    integrations: ['HubSpot', 'Google Ads', 'Meta Ads', 'GA4', 'LinkedIn Ads', 'Klaviyo', 'Salesforce', 'Slack'],
    quote: { text: 'We now run monthly reporting for 18 clients in the same time it used to take for 6. The AI doesn\'t just pull numbers — it writes the insight layer that used to take our senior team all day.', author: 'Chris M.', role: 'Managing Director, Performance Agency' },
  },

  // 9 ─ Travel & Hospitality
  {
    slug: 'travel',
    name: 'Travel & Hospitality',
    shortName: 'Travel',
    tagline: 'Fill rooms. Build loyalty. Beat OTA margin compression.',
    heroHeadline: 'The AI CMO built for\ntravel and hospitality brands.',
    heroSub: 'Direct booking campaigns, loyalty programme reactivation, seasonal yield strategy, and review response management — all powered by one AI CMO that knows your property, your guests, and your competition.',
    color: 'bg-cyan-600',
    colorHex: '#0891b2',
    emoji: '✈️',
    stats: [
      { val: '+31%', label: 'direct booking conversion rate' },
      { val: '−20%', label: 'OTA commission dependency' },
      { val: '3.7×', label: 'loyalty programme engagement' },
      { val: '+24%', label: 'ADR with AI-informed pricing campaigns' },
    ],
    painPoints: [
      { title: 'OTAs own your guests', desc: 'Booking.com and Expedia take 15–25% commission and keep the customer relationship. You fill the room but they win the loyalty.' },
      { title: 'Seasonal marketing is reactive, not proactive', desc: 'You launch a summer campaign when summer starts. Competitors who planned in March have already captured search intent and locked in corporate groups.' },
      { title: 'Guest loyalty is hard to activate at scale', desc: 'You have a loyalty database. Most of them haven\'t heard from you in 6 months. Reactivation emails get a 3% open rate because they\'re generic.' },
    ],
    useCases: [
      { title: 'Direct booking campaign', desc: 'Input your property type, USPs, and target guest profile. Get a direct-booking campaign with rate parity messaging, email sequence, and paid channel plan.', icon: '🏨' },
      { title: 'Seasonal yield strategy', desc: 'Input your occupancy data and competitor rates. Get a 90-day pricing communication strategy with targeted offers for low-demand windows.', icon: '📅' },
      { title: 'Loyalty reactivation', desc: 'Segment your lapsed guests by last-stay date and spend tier. Get a personalised reactivation offer and email sequence for each segment.', icon: '💌' },
      { title: 'Review response management', desc: 'Input a negative review. Get a professional, brand-appropriate response that acknowledges the issue, demonstrates action, and invites the guest back.', icon: '⭐' },
    ],
    kpis: ['ADR', 'RevPAR', 'OTA vs Direct Mix', 'Occupancy Rate', 'Guest LTV', 'Loyalty Reactivation Rate', 'Review Score', 'Cost per Booking'],
    integrations: ['Google Ads', 'Meta Ads', 'Mailchimp', 'Klaviyo', 'Stripe', 'GA4', 'Salesforce', 'HubSpot'],
    quote: { text: 'We shifted 12 percentage points from OTA to direct in one season using the AI-designed campaign strategy. That\'s €340K in saved commission.', author: 'Elena B.', role: 'Revenue Director, Boutique Hotel Group' },
  },

  // 10 ─ Creator Economy
  {
    slug: 'creator',
    name: 'Creator Economy & Media',
    shortName: 'Creator',
    tagline: 'Monetise your audience. Grow your brand. Own your data.',
    heroHeadline: 'The AI CMO built for\ncreators and media brands.',
    heroSub: 'Newsletter growth, sponsorship pitch decks, merchandise campaigns, subscription conversion, and audience analytics — all in one AI CMO. Build a business behind your audience, not just a following.',
    color: 'bg-fuchsia-600',
    colorHex: '#c026d3',
    emoji: '🎙️',
    stats: [
      { val: '+63%', label: 'newsletter subscriber growth rate' },
      { val: '4.1×', label: 'sponsorship deal close rate' },
      { val: '+38%', label: 'paid community conversion' },
      { val: '−50%', label: 'time on brand pitch decks' },
    ],
    painPoints: [
      { title: 'Audience growth without monetisation strategy', desc: 'You have 50K followers and a great open rate. But sponsorships are sporadic, merch is an afterthought, and your email list isn\'t segmented for conversion.' },
      { title: 'Sponsorship pitches undervalue your audience', desc: 'You pitch on follower count. Brands buy on CPM, engagement quality, and audience intent. You\'re leaving money on the table by not speaking their language.' },
      { title: 'Content calendar is always firefighting', desc: 'You know you should plan 4 weeks ahead. You\'re writing Thursday\'s newsletter on Thursday morning and wondering why open rates are declining.' },
    ],
    useCases: [
      { title: 'Audience monetisation roadmap', desc: 'Describe your audience size, niche, and current revenue. Get a 90-day monetisation roadmap with sponsored content, membership, and product launch sequencing.', icon: '💰' },
      { title: 'Sponsorship pitch deck', desc: 'Input your audience metrics and niche. Get a brand-ready media kit with audience persona, engagement benchmarks, and case study narrative.', icon: '🤝' },
      { title: 'Newsletter growth campaign', desc: 'Describe your newsletter topic. Get a referral programme structure, lead magnet ideas, social promotion calendar, and cross-promotion outreach templates.', icon: '📬' },
      { title: 'Paid community launch', desc: 'Describe your community concept. Get a launch sequence with founding member offer, email campaign, pricing strategy, and 30-day onboarding plan.', icon: '🚀' },
    ],
    kpis: ['Newsletter Open Rate', 'Subscriber Growth Rate', 'Revenue per Subscriber', 'Sponsorship CPM', 'Paid Community Churn', 'Merch Conversion', 'Audience LTV'],
    integrations: ['Mailchimp', 'ConvertKit', 'Stripe', 'Meta Ads', 'GA4', 'Klaviyo', 'Beehiiv', 'Substack'],
    quote: { text: 'My first AI-generated sponsorship pitch doubled my rates. The deck spoke to brand KPIs in a way I never had before — three yes\'s in the first week.', author: 'Jamie R.', role: 'Independent Creator, 120K subscribers' },
  },
];

export const industryBySlug = Object.fromEntries(industries.map((i) => [i.slug, i]));

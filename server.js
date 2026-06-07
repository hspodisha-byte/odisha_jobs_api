const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const DATA_GOV_API_KEY = process.env.DATA_GOV_API_KEY;
const JSEARCH_API_KEY = process.env.RAPID_API_KEY;

// ─── COUNTRY CODE MAP ─────────────────────────────────────────────────────────
const COUNTRY_MAP = [
  { keys: ['usa','united states','america','new york','california','texas','chicago','seattle','san francisco','los angeles','boston','miami'], code:'us', label:'United States' },
  { keys: ['uk','united kingdom','london','britain','england','scotland','wales','manchester','birmingham','edinburgh'], code:'gb', label:'United Kingdom' },
  { keys: ['canada','toronto','vancouver','montreal','calgary','ottawa'], code:'ca', label:'Canada' },
  { keys: ['australia','sydney','melbourne','brisbane','perth','adelaide'], code:'au', label:'Australia' },
  { keys: ['germany','berlin','munich','hamburg','frankfurt','cologne','deutschland'], code:'de', label:'Germany' },
  { keys: ['france','paris','lyon','marseille'], code:'fr', label:'France' },
  { keys: ['netherlands','amsterdam','rotterdam','the hague','holland'], code:'nl', label:'Netherlands' },
  { keys: ['new zealand','auckland','wellington','christchurch'], code:'nz', label:'New Zealand' },
  { keys: ['singapore','sg'], code:'sg', label:'Singapore' },
  { keys: ['south africa','johannesburg','cape town','durban'], code:'za', label:'South Africa' },
  { keys: ['brazil','sao paulo','rio de janeiro','brasil'], code:'br', label:'Brazil' },
  { keys: ['russia','moscow','st. petersburg'], code:'ru', label:'Russia' },
  { keys: ['poland','warsaw','krakow','wroclaw'], code:'pl', label:'Poland' },
  { keys: ['italy','milan','rome','florence','naples','italia'], code:'it', label:'Italy' },
  { keys: ['spain','madrid','barcelona','seville','espana'], code:'es', label:'Spain' },
  { keys: ['austria','vienna','graz','salzburg'], code:'at', label:'Austria' },
  { keys: ['belgium','brussels','antwerp','ghent'], code:'be', label:'Belgium' },
  { keys: ['switzerland','zurich','geneva','bern','basel'], code:'ch', label:'Switzerland' },
  { keys: ['mexico','mexico city','guadalajara','monterrey'], code:'mx', label:'Mexico' },
  { keys: ['uae','dubai','abu dhabi','sharjah'], code:'ae', label:'UAE' },
  { keys: ['india','odisha','bhubaneswar','cuttack','puri','rourkela','sambalpur',
            'delhi','new delhi','mumbai','bombay','bangalore','bengaluru',
            'chennai','madras','kolkata','calcutta','hyderabad','pune',
            'ahmedabad','jaipur','lucknow','chandigarh','kochi','cochin',
            'surat','nagpur','indore','bhopal','patna','ranchi','guwahati',
            'thiruvananthapuram','visakhapatnam','coimbatore','vadodara',
            'rajasthan','gujarat','maharashtra','karnataka','tamil nadu',
            'west bengal','uttar pradesh','madhya pradesh','kerala','bihar',
            'jharkhand','assam','andhra pradesh','telangana','punjab','haryana'],
    code:'in', label:'India' }
];

// FIELD_RULES, detectField, CAREER_GUIDES, getCareerGuide
// isCreativeRole, fetchHimalayas, fetchJSearch, fetchAdzuna  
// app.post, app.get routes, app.listen

function getCountryInfo(text) {
  const t = text.toLowerCase();
  for (const entry of COUNTRY_MAP) {
    if (entry.keys.some(k => t.includes(k))) return { code: entry.code, label: entry.label };
  }
  return { code:'in', label:'India' };
}

const INDIA_CITIES = {
  'odisha':['Odisha','Bhubaneswar','Cuttack','Puri','Rourkela','Sambalpur'],
  'bhubaneswar':['Bhubaneswar'], 'cuttack':['Cuttack'], 'puri':['Puri'],
  'rourkela':['Rourkela'], 'sambalpur':['Sambalpur'],
  'delhi':['Delhi','New Delhi'], 'mumbai':['Mumbai','Bombay'],
  'bangalore':['Bangalore','Bengaluru'], 'bengaluru':['Bengaluru','Bangalore'],
  'chennai':['Chennai','Madras'], 'kolkata':['Kolkata','Calcutta'],
  'hyderabad':['Hyderabad'], 'pune':['Pune'], 'ahmedabad':['Ahmedabad'],
  'jaipur':['Jaipur'], 'lucknow':['Lucknow'], 'chandigarh':['Chandigarh'],
  'kochi':['Kochi','Cochin'], 'guwahati':['Guwahati'],
};

function extractLocation(queryText) {
  const t = queryText.toLowerCase();
  for (const [key, variants] of Object.entries(INDIA_CITIES)) {
    if (t.includes(key)) return variants[0];
  }
  for (const entry of COUNTRY_MAP) {
    for (const k of entry.keys) {
      if (t.includes(k)) return k.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    }
  }
  return '';
}

// ─── FIELD DETECTION ──────────────────────────────────────────────────────────
const FIELD_RULES = [
  // ── FINE ART / VISUAL ART ──────────────────────────────────────────────────
  { keys:['painting','painter','oil painting','acrylic painting','watercolor','mural','canvas artist','portrait painter','landscape painter'], label:'Painting' },
  { keys:['sculpture','sculptor','sculpting','stone carving','metal sculpture','bronze casting','clay modeling','installation sculpture'], label:'Sculpture' },
  { keys:['graphic art','printmaking','etching','lithography','screen printing','woodcut','engraving','serigraphy'], label:'Graphic Art' },
  { keys:['applied art','commercial art','advertising art','book design','poster design','calendar art'], label:'Applied Art' },
  { keys:['traditional art','folk art','tribal art','madhubani','warli','pattachitra','kalamkari','tanjore','miniature painting','phad painting','gond art','dhokra','santhal art'], label:'Traditional Art' },
  { keys:['art history','art historian','art critic','art researcher','museum studies','art curator','art conservation','art restoration'], label:'Art History & Curation' },
  { keys:['public art','street art','mural art','wall painting','graffiti artist','community art','installation art','site specific art','land art'], label:'Public & Installation Art' },
  { keys:['craft','handicraft','handicrafts','artisan','pottery','ceramics','weaving','embroidery','textile craft','bamboo craft','wood craft','metal craft','paper mache','applique','ikat','sambalpuri','chandua'], label:'Craft / Handicrafts' },
  { keys:['wall painting','muralist','fresco','wall art','interior mural'], label:'Wall Painting' },
  { keys:['installation','installation artist','immersive art','multimedia installation','sound installation','video installation'], label:'Installation Art' },

  // ── Fashion & Apparel ──────────────────────────────────────────────────────
  { keys:['fashion model','runway model','editorial model','fit model','showroom model','catwalk model'], label:'Fashion Modelling' },
  { keys:['fashion communication','fashion pr','fashion marketing','fashion media','fashion content','fashion branding','fashion promotion','fashion publicist'], label:'Fashion Communication' },
  { keys:['fashion product','fashion product development','apparel product manager','garment product','fashion product manager','product development executive fashion'], label:'Fashion Product Development' },
  { keys:['fashion illustrat','fashion illustration','fashion sketch','costume illustrat','apparel illustrat'], label:'Fashion Illustration' },
  { keys:['fashion stylist','editorial stylist','wardrobe stylist','celebrity stylist','personal stylist','commercial stylist','prop stylist fashion'], label:'Fashion Styling' },
  { keys:['pattern maker','pattern cutter','pattern grader','garment pattern','draper','pattern technician','cutter fashion','marker maker'], label:'Pattern Making & Cutting' },
  { keys:['garment technologist','garment tech','clothing technologist','apparel technologist','quality technologist fashion','fit technologist','technical designer'], label:'Garment Technology' },
  { keys:['apparel production manager','garment production manager','production manager fashion','apparel manufacturing manager','clothing production','production coordinator fashion','apparel operations'], label:'Apparel Production Management' },
  { keys:['visual merchandis','vm executive','vm manager','store display','window display','retail display designer','visual retail'], label:'Visual Merchandising' },
  { keys:['fashion merchandis','apparel merchandis','buying merchandis','merchandise planner fashion','fashion buyer merchandis'], label:'Fashion Merchandising' },
  { keys:['trend forecast','trend analyst','trend researcher','fashion forecaster','colour forecaster','trend consultant','trend intelligence'], label:'Trend Forecasting' },
  { keys:['fashion journalist','fashion editor','fashion writer','fashion blogger','fashion content writer','fashion copywriter','fashion reporter','vogue editor','elle editor','fashion magazine'], label:'Fashion Journalism & Editing' },
  { keys:['fashion photograph','fashion photo','fashion shooter','apparel photographer','lookbook photographer','catalogue photographer','editorial photographer fashion'], label:'Fashion Photography' },
  { keys:['fashion buyer','garment buyer','apparel buyer','clothing buyer','retail buyer fashion','buying assistant fashion','sourcing buyer'], label:'Fashion Buying' },
  { keys:['fashion design','fashion designer','apparel designer','costume design','garment design','womenswear','menswear','couture','rtw designer','knitwear designer','swimwear designer','lingerie designer'], label:'Fashion Design' },

  // ── Other Design Fields ────────────────────────────────────────────────────
  { keys:['textile','fabric design','weaving','knitting pattern','surface design'], label:'Textile Design' },
  { keys:['architect','architecture','architectural designer','bim'], label:'Architecture' },
  { keys:['interior design','interior designer','space designer','interior decorator','set designer'], label:'Interior Design' },
  { keys:['graphic design','graphic designer','visual designer','brand designer','identity designer','print designer'], label:'Graphic Design' },
  { keys:['ui/ux','ui ux','ux designer','ui designer','user experience','user interface','product designer','interaction design','hci'], label:'UI/UX Design' },
  { keys:['animation','animator','3d artist','2d artist','3d designer','vfx','visual effects','rigging','motion capture','character design','character artist'], label:'Animation / 2D / 3D Art' },
  { keys:['photograph','photographer','photo editor','photojournalist','commercial photographer','videographer','cinematographer'], label:'Photography & Film' },
  { keys:['digital art','digital artist','concept artist','digital illustrat','nft artist'], label:'Digital Art' },
  { keys:['product design','industrial design','industrial designer','product developer'], label:'Product / Industrial Design' },
  { keys:['illustrat','illustrator','book illustrat'], label:'Illustration' },
  { keys:['motion graphic','motion design','motion designer','after effects','motion artist'], label:'Motion Graphics' },
  { keys:['jewellery','jewelry','jewel design','accessory design','goldsmith'], label:'Jewellery Design' },
  { keys:['makeup','make-up','makeup artist','mua','beauty artist','sfx makeup','hair and makeup','cosmetology'], label:'Makeup & Beauty Art' },
  { keys:['game design','game designer','game artist','level designer','environment artist','game developer'], label:'Game Design & Art' },
  { keys:['web design','web designer','frontend design','web developer designer'], label:'Web Design' },
  { keys:['packaging design','packaging designer','package design'], label:'Packaging Design' },
  { keys:['typography','type design','typeface','font designer','lettering'], label:'Typography & Lettering' },
  { keys:['art director','creative director','design director','head of design','chief creative'], label:'Art / Creative Direction' },
  { keys:['exhibition design','museum design','display design','curation','curator'], label:'Exhibition & Curation' },
  { keys:['landscape design','landscape architect','urban design','urban planner'], label:'Landscape / Urban Design' },
  { keys:['furniture design','furniture designer','woodwork designer','cabinet maker'], label:'Furniture Design' },
  { keys:['brand','branding','brand identity','brand strategist'], label:'Branding & Identity' },
];

function detectField(text) {
  const t = text.toLowerCase();
  for (const rule of FIELD_RULES) {
    if (rule.keys.some(k => t.includes(k))) return rule.label;
  }
  return 'Design & Art';
}

// ─── CAREER GUIDES ────────────────────────────────────────────────────────────
const CAREER_GUIDES = {
  'Painting': {
    skills: ['Oil/Acrylic Techniques', 'Color Theory', 'Composition', 'Art History', 'Portfolio Development'],
    portfolio: '15-20 best works showing range: portraits, landscapes, abstract. Include a written artist statement.',
    salary: '₹2–5 LPA starting; ₹10–30 LPA for established artists. Gallery sales range from ₹50K to ₹5L per piece.',
    companies: ['Art Galleries', 'Museums', 'Corporate Collections', 'Private Commissions', 'Art Schools'],
    tip: 'Participate in events like India Art Fair and Kochi Biennale to build visibility. Maintain an active Instagram art page to attract collectors and commissions.'
  },
  'Sculpture': {
    skills: ['Clay Modeling', 'Stone/Metal Work', 'Bronze Casting', 'Welding', '3D Design Software'],
    portfolio: 'Photographs of 8–10 sculptures from multiple angles. Process videos and behind-the-scenes documentation add value.',
    salary: '₹3–6 LPA for studio roles; ₹1–10L per commission for established sculptors.',
    companies: ['Public Art Projects', 'Museums', 'Architecture Firms', 'Private Collectors'],
    tip: 'Explore government tenders for public art commissions. Apply for Lalit Kala Akademi grants and residencies to gain recognition.'
  },
  'Traditional Art': {
    skills: ['Pattachitra', 'Madhubani', 'Gond', 'Dhokra', 'Natural Dyes', 'Visual Storytelling'],
    portfolio: 'Traditional works alongside contemporary adaptations. Document and share your process to attract buyers and institutions.',
    salary: '₹15K–50K per month for studio/institutional work. Export orders can fetch ₹1–5L. Additional income through government craft schemes.',
    companies: ['Tribes India', 'Fabindia', 'Export Houses', 'Craft Museums', 'State Tourism Departments'],
    tip: 'Focus on GI-tagged products for export premium. Apply for Odisha government handicraft schemes and participate in Dastkar bazaars and national craft fairs.'
  },
  'Public & Installation Art': {
    skills: ['Large-Scale Design', 'Project Management', 'Community Engagement', 'Weatherproof Materials', 'AR/VR Integration'],
    portfolio: 'Site-specific proposals, past installation documentation, and community impact stories.',
    salary: '₹5–15 LPA project-based. Major installations can fetch ₹10–50L per project.',
    companies: ['Smart City Missions', 'Metro Rail Projects', 'Airports', 'Corporate Campuses', 'Art Festivals'],
    tip: 'Monitor Smart City Mission tenders for public art opportunities. Apply to festivals such as Kala Ghoda and Serendipity Arts Festival for commissions and visibility.'
  },
  'Craft / Handicrafts': {
    skills: ['Traditional Techniques', 'Product Development', 'Quality Control', 'E-commerce', 'Branding'],
    portfolio: 'A curated product range with clear pricing. Show the craft process visually. Professional packaging significantly impacts buyer perception.',
    salary: '₹20K–1L per month. Annual export revenue of ₹5–20L is achievable with the right buyers.',
    companies: ['Fabindia', 'Good Earth', 'Jaypore', 'Okhai', 'Amazon Karigar'],
    tip: 'Register on the GeM (Government e-Marketplace) portal for institutional orders. Leverage the ODOP (One District One Product) scheme. Join local craft clusters for training and market access.'
  },
  'Art History & Curation': {
    skills: ['Research', 'Academic Writing', 'Critical Analysis', 'Museum Studies', 'Conservation Basics'],
    portfolio: 'Published papers, exhibition catalogues, and documentation of curated shows.',
    salary: '₹4–8 LPA in museum roles; ₹10–25 LPA for senior curators. Freelance curation fetches ₹50K–2L per show.',
    companies: ['NGMA', 'National Museum', 'Kiran Nadar Museum of Art', "Christie's", 'Saffronart'],
    tip: 'A PhD strengthens your profile for senior roles. Target international residencies and fellowships. Start publishing art writing and criticism to build thought leadership.'
  },
  'Fashion Design': {
    skills: ['Adobe Illustrator', 'CLO 3D', 'Pattern Making', 'Trend Research', 'Fabric Knowledge'],
    portfolio: 'Include 8–10 complete collections with technical packs and mood boards.',
    salary: '₹3–6 LPA for freshers; ₹15–40 LPA at senior level in luxury and premium brands.',
    companies: ['Gucci', 'Prada', 'Sabyasachi', 'Anita Dongre', 'Myntra Design Studio'],
    tip: 'Internships at Business of Fashion or Vogue are the strongest launchpad for editorial and luxury roles. Build a strong digital portfolio on Behance.'
  },
  'Fashion Communication': {
    skills: ['Content Writing', 'Social Media Strategy', 'PR & Brand Communications', 'Photoshop', 'Brand Strategy'],
    portfolio: 'Campaign case studies, press releases, and social media growth metrics demonstrating impact.',
    salary: '₹4–8 LPA for freshers; ₹12–25 LPA with luxury fashion houses.',
    companies: ['Vogue India', 'Elle India', 'Business of Fashion', 'Condé Nast', 'Fashion PR agencies'],
    tip: 'An internship at Vogue or BoF is the most effective step into luxury fashion communications. Build a strong personal brand on LinkedIn and Instagram.'
  },
  'Fashion Modelling': {
    skills: ['Runway Technique', 'Posing & Body Awareness', 'Portfolio Development', 'Grooming', 'Fitness'],
    portfolio: 'Professional comp card with editorial, commercial, and catalogue shots. 10–15 high-quality images minimum.',
    salary: '₹15K–1L per shoot at entry level; ₹5–30L annually for working models. Top models earn significantly more.',
    companies: ['Elite Model Management', 'Anima Creative Management', 'Toabh Models', 'Inega Model Agency'],
    tip: 'Register with a reputable agency rather than approaching brands directly. Build a strong Instagram presence and attend fashion weeks to get noticed by designers.'
  },
  'Fashion Styling': {
    skills: ['Wardrobe Curation', 'Trend Awareness', 'Colour Theory', 'Client Communication', 'Photoshoot Coordination'],
    portfolio: 'Lookbooks, editorial shoots, and celebrity/client styling documentation with credits.',
    salary: '₹3–6 LPA starting; ₹15–40 LPA for established celebrity or commercial stylists.',
    companies: ['Vogue India', 'Filmfare', 'Production Houses', 'Celebrity Management Firms', 'Advertising Agencies'],
    tip: 'Assist a senior stylist for 1–2 years to build industry contacts. Instagram is the primary portfolio platform — keep it updated with your best work.'
  },
  'Trend Forecasting': {
    skills: ['Market Research', 'Consumer Behaviour Analysis', 'Colour Forecasting', 'Data Analysis', 'Presentation'],
    portfolio: 'Trend reports, colour stories, and forecasting decks with clear rationale and visual direction.',
    salary: '₹5–10 LPA entry level; ₹15–30 LPA at senior levels. Global agencies pay significantly more.',
    companies: ['WGSN', 'Trendalytics', 'IMG Fashion', 'Textile Exchange', 'Myntra Strategy Team'],
    tip: 'Subscribe to and study leading platforms like WGSN and Trendalytics. Build a niche — colour, materials, or a specific consumer segment — to stand out.'
  },
  'Visual Merchandising': {
    skills: ['Store Layout Planning', 'Display Design', 'Brand Guideline Adherence', 'Planogram Execution', 'Retail Analytics'],
    portfolio: 'Before/after store displays, window installations, and campaign visual setups with measurable impact.',
    salary: '₹3–6 LPA for VM executives; ₹10–20 LPA for VM managers at large retail chains.',
    companies: ['Shoppers Stop', 'Lifestyle', 'H&M India', 'Zara India', 'Reliance Retail'],
    tip: 'Strong knowledge of brand guidelines and planogram software is essential. Retail analytics skills that demonstrate sales impact are increasingly valued by employers.'
  },
  'Pattern Making & Cutting': {
    skills: ['Manual Drafting', 'Grading', 'CAD Pattern Software (Gerber/Lectra)', 'Fit Analysis', 'Technical Specification Writing'],
    portfolio: 'Sample blocks, graded patterns, and annotated tech packs showcasing your precision and range.',
    salary: '₹3–7 LPA in garment export units; ₹8–18 LPA in technical design roles at premium brands.',
    companies: ['Orient Craft', 'Shahi Exports', 'Arvind Brands', 'Aditya Birla Fashion', 'W for Woman'],
    tip: 'Proficiency in Gerber or Lectra CAD software significantly increases employability in export houses and premium brands.'
  },
  'Garment Technology': {
    skills: ['Fabric & Material Science', 'Fit Analysis', 'Quality Standards (ISO/OEKO-TEX)', 'Technical Specification Writing', 'Production Liaison'],
    portfolio: 'Tech packs, quality audit reports, and fit evaluation documentation.',
    salary: '₹4–8 LPA for garment technologists; ₹12–25 LPA for senior technical roles.',
    companies: ['H&M India', 'Marks & Spencer Sourcing', 'Tata Trent', 'Madura Fashion & Lifestyle', 'Export Houses'],
    tip: 'Certifications in textile testing or quality management (e.g., OEKO-TEX) are a strong differentiator when applying to international buyers and sourcing offices.'
  },
  'Fashion Photography': {
    skills: ['Studio Lighting', 'Adobe Lightroom & Photoshop', 'Art Direction', 'Client Coordination', 'Retouching'],
    portfolio: 'Lookbooks, editorial shoots, and e-commerce catalogues. Keep your Instagram portfolio updated with recent work.',
    salary: '₹25K–1L per shoot; ₹6–20 LPA annually depending on clients and frequency.',
    companies: ['Vogue India', 'Harper\'s Bazaar India', 'Myntra', 'Nykaa Fashion', 'Advertising Agencies'],
    tip: 'Assisting an established fashion photographer for 6–12 months is the fastest way to build industry contacts and technical skills.'
  },
  'Fashion Buying': {
    skills: ['Trend Analysis', 'Supplier Negotiation', 'Range Planning', 'Open-to-Buy Budgeting', 'Retail Analytics'],
    portfolio: 'Range plans, buying reports, and category performance analyses with measurable business outcomes.',
    salary: '₹5–10 LPA for buying assistants/executives; ₹15–35 LPA for senior buyers.',
    companies: ['Myntra', 'Reliance Trends', 'Lifestyle International', 'Max Fashion', 'Shoppers Stop'],
    tip: 'An MBA in Retail or Fashion Management significantly accelerates career growth in buying. Strong Excel and data analysis skills are as important as fashion awareness.'
  },
  'Fashion Journalism & Editing': {
    skills: ['Fashion Writing & Storytelling', 'Interviewing', 'SEO', 'Social Media', 'Visual Editing'],
    portfolio: 'Published articles, editorial features, and digital content metrics demonstrating readership and engagement.',
    salary: '₹3–6 LPA for entry-level editorial roles; ₹10–25 LPA for senior editors at major publications.',
    companies: ['Vogue India', 'Elle India', 'Cosmopolitan India', 'Harper\'s Bazaar', 'Femina'],
    tip: 'Build a byline by contributing to fashion blogs, online magazines, and LinkedIn. Internships at print or digital fashion publications are the most direct path into this field.'
  },
  'UI/UX Design': {
    skills: ['Figma', 'User Research', 'Prototyping', 'Usability Testing', 'Design Systems'],
    portfolio: 'Case studies on Behance/Dribbble showing problem → process → solution for 4–6 projects.',
    salary: '₹5–10 LPA for freshers; ₹15–40 LPA for senior product designers.',
    companies: ['Swiggy', 'Zomato', 'Razorpay', 'Myntra', 'Flipkart Design', 'ThoughtWorks'],
    tip: 'Focus on case studies over visual polish — employers want to see your thinking process. Contribute to open-source design systems to build credibility.'
  },
  'Graphic Design': {
    skills: ['Adobe Illustrator', 'Photoshop', 'InDesign', 'Typography', 'Brand Identity'],
    portfolio: 'Diverse projects including print, branding, and digital on Behance. Include personal projects.',
    salary: '₹3–6 LPA for freshers; ₹10–25 LPA at senior levels in agencies or tech companies.',
    companies: ['Ogilvy', 'McCann', 'Dentsu', 'Wunderman Thompson', 'In-house brand teams'],
    tip: 'Develop a niche — brand identity, editorial, or motion — to command higher freelance rates. A strong Behance presence is the most effective portfolio tool.'
  },
  'Interior Design': {
    skills: ['AutoCAD', 'SketchUp', 'Space Planning', 'Material Specification', 'Project Coordination'],
    portfolio: '5–8 complete projects with floor plans, renders, and finished photography.',
    salary: '₹3–7 LPA for freshers; ₹15–40 LPA for senior designers at premium studios.',
    companies: ['Godrej Interio', 'Livspace', 'Urban Ladder', 'HOK', 'Spaces Architects'],
    tip: 'Proficiency in 3D visualization software like 3ds Max or Lumion significantly improves project win rates. Residential luxury and hospitality are the highest-paying segments.'
  },
  'Animation / 2D / 3D Art': {
    skills: ['Maya/Blender', 'After Effects', 'Character Rigging', 'Storyboarding', 'Compositing'],
    portfolio: 'Demo reel under 2 minutes showcasing character animation, environment art, or VFX work.',
    salary: '₹4–8 LPA for freshers; ₹15–40 LPA at senior levels in film/game studios.',
    companies: ['DQ Entertainment', 'Green Gold Animation', 'Prime Focus', 'Ubisoft India', 'Technicolor'],
    tip: 'Specialize early — character animation, environment art, or VFX. A focused demo reel is far more effective than a broad showreel when applying to studios.'
  },
  'Architecture': {
    skills: ['AutoCAD', 'Revit/BIM', 'SketchUp', 'Structural Principles', 'Sustainable Design'],
    portfolio: '4–6 projects with concept drawings, models, and construction drawings where available.',
    salary: '₹3–6 LPA for freshers; ₹15–50 LPA for senior architects at top firms.',
    companies: ['Hafeez Contractor', 'CP Kukreja Architects', 'Morphogenesis', 'Meinhardt', 'AECOM India'],
    tip: 'Council of Architecture registration is mandatory to practice in India. Sustainability certifications (GRIHA, LEED) are increasingly valued by clients.'
  },
  'Photography & Film': {
    skills: ['Lighting', 'Adobe Lightroom/Premiere', 'Colour Grading', 'Storytelling', 'Client Management'],
    portfolio: 'Specialized work in your niche — wedding, commercial, documentary, or fine art.',
    salary: '₹3–8 LPA employed; ₹50K–5L per project for established freelancers.',
    companies: ['Production Houses', 'Advertising Agencies', 'Media Companies', 'Wedding Studios', 'NGOs'],
    tip: 'Identify and commit to a niche early. Commercial and advertising photography tends to be the most financially rewarding segment in India.'
  },
  'Design & Art': {
    skills: ['Portfolio Development', 'Networking', 'Personal Branding', 'Relevant Software Skills'],
    portfolio: 'Strong Behance or Dribbble presence with diverse, well-documented projects.',
    salary: '₹3–8 LPA starting; varies significantly by specialization.',
    companies: ['Design Agencies', 'Startups', 'In-house Brand Teams', 'Freelance'],
    tip: 'Narrow down your search to a specific discipline — painting, sculpture, fashion design, UI/UX — for more relevant and higher-quality job results.'
  }
};

function getCareerGuide(fieldName) {
  return CAREER_GUIDES[fieldName] || CAREER_GUIDES['Design & Art'];
}

// ─── CREATIVE FILTER ──────────────────────────────────────────────────────────
function isCreativeRole(text) {
  const t = (text || '').toLowerCase();
  const creativeKeys = [
    'art','craft','design','creative','visual','graphic','fashion','textile',
    'interior','architect','photo','video','animation','digital','illustrat',
    'paint','sculpture','ceramic','printmak','jewelry','jewellery','handicraft',
    'artisan','makeup','beauty','game','web','brand','exhibition','museum',
    'curator','landscape','furniture','motion','packaging','typography','calligraph',
    'culture','heritage','handloom','weav','embroidery','dhokra','pattachitra',
    'applique','ikat','sambalpuri','odissi','folk art','tribal art',
    'model','stylist','merchandis','pattern mak','pattern cut','garment tech',
    'apparel','trend forecast','journalist','editor','buyer','couture',
    'womenswear','menswear','knitwear','swimwear','lingerie','wardrobe',
    'lookbook','catalogue','editorial','runway','catwalk','showroom',
    'vm executive','visual merch','window display','retail display',
    'mural','fresco','installation','public art','street art','graffiti',
    'etching','lithography','pottery','bronze','carving','miniature'
  ];
  return creativeKeys.some(k => t.includes(k));
}

// ─── HIMALAYAS API ────────────────────────────────────────────────────────────
async function fetchHimalayas(searchWhat) {
  try {
    const resp = await axios.get('https://himalayas.app/jobs/api', {
      params: { limit: 15, search: searchWhat },
      timeout: 8000
    });
    const jobs = resp.data?.jobs || [];
    return jobs
      .filter(j => isCreativeRole(j.title || ''))
      .map(j => ({
        id: 'hima_' + j.id,
        title: j.title,
        org: j.companyName,
        location: j.locationRestrictions || 'Remote',
        desc: (j.excerpt || '').slice(0, 250) + '...',
        link: `https://himalayas.app/jobs/${j.companySlug}/${j.slug}`,
        deadline: 'Rolling',
        posted: j.pubDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        startDate: 'Immediate',
        type: j.employmentType || 'Full-time',
        salary: j.minSalary ? `${j.minSalary}–${j.maxSalary || '?'} ${j.salaryCurrency}` : null,
        field: detectField(j.title + ' ' + j.excerpt),
        src: 'himalayas',
        srcLabel: 'Himalayas',
        country: 'Remote',
        odisha: false,
        verified: true
      }));
  } catch (e) {
    console.warn('[Himalayas]', e.message);
    return [];
  }
}

// ─── JSEARCH API ──────────────────────────────────────────────────────────────
async function fetchJSearch(query, countryCode) {
  if (!JSEARCH_API_KEY) return [];
  try {
    const resp = await axios.get('https://jsearch.p.rapidapi.com/search', {
      params: { query: query, page: '1', num_pages: '1', country: countryCode },
      headers: { 'X-RapidAPI-Key': JSEARCH_API_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
      timeout: 10000
    });
    const jobs = resp.data?.data || [];
    return jobs.map(job => ({
      id: 'js_' + job.job_id,
      title: job.job_title,
      org: job.employer_name,
      location: `${job.job_city || ''}, ${job.job_country}`.trim(),
      desc: (job.job_description || '').slice(0, 250) + '...',
      link: job.job_apply_link,
      deadline: 'Rolling',
      posted: job.job_posted_at_datetime_utc?.split('T')[0] || new Date().toISOString().split('T')[0],
      startDate: 'Immediate',
      type: job.job_employment_type || 'Full-time',
      salary: job.job_min_salary ? `${job.job_min_salary}–${job.job_max_salary || '?'} ${job.job_salary_currency}` : null,
      field: detectField(job.job_title + ' ' + job.job_description),
      src: 'jsearch',
      srcLabel: job.job_publisher || 'JSearch',
      country: job.job_country,
      odisha: (job.job_city || '').toLowerCase().includes('odisha'),
      verified: true
    }));
  } catch (e) {
    console.warn('[JSearch]', e.message);
    return [];
  }
}

// ─── ADZUNA HELPER ────────────────────────────────────────────────────────────
async function fetchAdzuna(countryCode, countryLabel, searchWhat, location) {
  try {
    const params = {
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      what: searchWhat,
      results_per_page: 20,
      'content-type': 'application/json'
    };
    if (location) params.where = location;

    const r = await axios.get(`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`, { params, timeout: 10000 });
    return (r.data.results || []).map(job => ({
      id: 'adz_' + job.id,
      title: job.title,
      org: job.company.display_name,
      location: job.location.display_name,
      desc: (job.description || '').slice(0, 250) + '...',
      link: job.redirect_url,
      deadline: 'Rolling',
      posted: new Date(job.created).toISOString().split('T')[0],
      startDate: 'Immediate',
      type: job.contract_time || 'Full-time',
      salary: job.salary_min ? `${job.salary_min}–${job.salary_max || '?'}${job.salary_is_predicted ? ' (est.)' : ''}` : null,
      field: detectField(job.title + ' ' + job.description),
      src: 'adzuna',
      srcLabel: 'Adzuna',
      country: countryLabel,
      odisha: (job.location.display_name || '').toLowerCase().includes('odisha'),
      verified: true
    }));
  } catch (e) {
    console.error('[Adzuna ERROR]', e.message);
    return [];
  }
}

// ─── POST /api/search ─────────────────────────────────────────────────────────
app.post('/api/search', async (req, res) => {
  const { q, field, type } = req.body;
  const rawQuery = q || field || 'designer';
  const { code: countryCode, label: countryLabel } = getCountryInfo(rawQuery);
  const location = extractLocation(rawQuery);

  const searchWhat = field || rawQuery;
  const detectedField = detectField(searchWhat);
  let allJobs = [];

  const [adzunaJobs, jsearchJobs, himalayasJobs] = await Promise.all([
    fetchAdzuna(countryCode, countryLabel, searchWhat, location),
    fetchJSearch(searchWhat, countryCode),
    fetchHimalayas(searchWhat)
  ]);

  allJobs.push(...adzunaJobs, ...jsearchJobs, ...himalayasJobs);

  const seen = new Set();
  allJobs = allJobs.filter(j => {
    const key = (j.title + j.org).toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const guide = getCareerGuide(detectedField);

  res.json({
    jobs: allJobs,
    total: allJobs.length,
    country: countryLabel,
    location: location || 'All regions',
    field: detectedField,
    guide: guide,
    advice: `Found ${allJobs.length} ${detectedField} jobs${location ? ' in ' + location : ''}. ${guide.tip}`,
    sourcesSearched: ['Adzuna', 'JSearch', 'Himalayas'],
    searchTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });
});

// ─── GET /api/jobs ─────────────────────────────────────────────────────────────
app.get('/api/jobs', async (req, res) => {
  const q = req.query.q || '';
  const field = req.query.field || '';
  const locationParam = req.query.location || '';
  const disciplineParam = req.query.discipline || '';

  const locationHint = [locationParam, q, field, disciplineParam].join(' ');
  const { code: countryCode, label: countryLabel } = getCountryInfo(locationHint);
  const location = locationParam || extractLocation(locationHint);

  let searchWhat;
  if (disciplineParam) searchWhat = disciplineParam;
  else if (q) searchWhat = q;
  else if (field) searchWhat = field;
  else searchWhat = 'painting sculpture';

  const detectedField = detectField(searchWhat);
  let allJobs = [];

  const [adzunaJobs, jsearchJobs, himalayasJobs] = await Promise.all([
    fetchAdzuna(countryCode, countryLabel, searchWhat, location),
    fetchJSearch(searchWhat, countryCode),
    fetchHimalayas(searchWhat)
  ]);

  allJobs.push(...adzunaJobs, ...jsearchJobs, ...himalayasJobs);

  const seen = new Set();
  allJobs = allJobs.filter(j => {
    const key = (j.title + j.org).toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const guide = getCareerGuide(detectedField);
  res.json({
    jobs: allJobs,
    field: detectedField,
    guide: guide
  });
});

// ─── GET /api/disciplines ──────────────────────────────────────────────────────
app.get('/api/disciplines', (req, res) => {
  res.json(FIELD_RULES.map(r => r.label));
});

// ─── GET /api/guide/:field ────────────────────────────────────────────────────
app.get('/api/guide/:field', (req, res) => {
  const fieldName = req.params.field;
  const guide = getCareerGuide(fieldName);
  res.json(guide);
});

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    adzuna: !!(ADZUNA_APP_ID && ADZUNA_APP_KEY),
    jsearch: !!JSEARCH_API_KEY,
    himalayas: true,
    time: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ ODA Portal Server running on port ${PORT}`));

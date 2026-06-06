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

// ─── COUNTRY CODE MAP ────────────────────────────────────────────────────────
// Maps location keywords → Adzuna country codes
// Adzuna supports: gb, us, au, ca, de, fr, in, nl, nz, sg, za, br, ru, pl, it, es, at, be, ch, mx, ae
const COUNTRY_MAP = [
  { keys: ['usa', 'united states', 'america', 'new york', 'california', 'texas', 'chicago', 'seattle', 'san francisco', 'los angeles', 'boston', 'miami'], code: 'us', label: 'United States' },
  { keys: ['uk', 'united kingdom', 'london', 'britain', 'england', 'scotland', 'wales', 'manchester', 'birmingham', 'edinburgh'], code: 'gb', label: 'United Kingdom' },
  { keys: ['canada', 'toronto', 'vancouver', 'montreal', 'calgary', 'ottawa'], code: 'ca', label: 'Canada' },
  { keys: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide'], code: 'au', label: 'Australia' },
  { keys: ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne', 'deutschland'], code: 'de', label: 'Germany' },
  { keys: ['france', 'paris', 'lyon', 'marseille'], code: 'fr', label: 'France' },
  { keys: ['netherlands', 'amsterdam', 'rotterdam', 'the hague', 'holland'], code: 'nl', label: 'Netherlands' },
  { keys: ['new zealand', 'auckland', 'wellington', 'christchurch'], code: 'nz', label: 'New Zealand' },
  { keys: ['singapore', 'sg'], code: 'sg', label: 'Singapore' },
  { keys: ['south africa', 'johannesburg', 'cape town', 'durban'], code: 'za', label: 'South Africa' },
  { keys: ['brazil', 'sao paulo', 'rio de janeiro', 'brasil'], code: 'br', label: 'Brazil' },
  { keys: ['russia', 'moscow', 'st. petersburg'], code: 'ru', label: 'Russia' },
  { keys: ['poland', 'warsaw', 'krakow', 'wroclaw'], code: 'pl', label: 'Poland' },
  { keys: ['italy', 'milan', 'rome', 'florence', 'naples', 'italia'], code: 'it', label: 'Italy' },
  { keys: ['spain', 'madrid', 'barcelona', 'seville', 'espana'], code: 'es', label: 'Spain' },
  { keys: ['austria', 'vienna', 'graz', 'salzburg'], code: 'at', label: 'Austria' },
  { keys: ['belgium', 'brussels', 'antwerp', 'ghent'], code: 'be', label: 'Belgium' },
  { keys: ['switzerland', 'zurich', 'geneva', 'bern', 'basel'], code: 'ch', label: 'Switzerland' },
  { keys: ['mexico', 'mexico city', 'guadalajara', 'monterrey'], code: 'mx', label: 'Mexico' },
  { keys: ['uae', 'dubai', 'abu dhabi', 'sharjah'], code: 'ae', label: 'UAE' },
  // India cities / states
  { keys: ['india', 'odisha', 'bhubaneswar', 'cuttack', 'puri', 'rourkela', 'sambalpur',
           'delhi', 'new delhi', 'mumbai', 'bombay', 'bangalore', 'bengaluru',
           'chennai', 'madras', 'kolkata', 'calcutta', 'hyderabad', 'pune',
           'ahmedabad', 'jaipur', 'lucknow', 'chandigarh', 'kochi', 'cochin',
           'surat', 'nagpur', 'indore', 'bhopal', 'patna', 'ranchi', 'guwahati',
           'thiruvananthapuram', 'visakhapatnam', 'coimbatore', 'vadodara',
           'rajasthan', 'gujarat', 'maharashtra', 'karnataka', 'tamil nadu',
           'west bengal', 'uttar pradesh', 'madhya pradesh', 'kerala', 'bihar',
           'jharkhand', 'assam', 'andhra pradesh', 'telangana', 'punjab', 'haryana'],
    code: 'in', label: 'India' }
];

function getCountryInfo(text) {
  const t = text.toLowerCase();
  for (const entry of COUNTRY_MAP) {
    if (entry.keys.some(k => t.includes(k))) {
      return { code: entry.code, label: entry.label };
    }
  }
  return { code: 'in', label: 'India' }; // default
}

// ─── INDIA STATE / CITY MAP ──────────────────────────────────────────────────
const INDIA_CITIES = {
  'odisha': ['Odisha', 'Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela', 'Sambalpur'],
  'delhi': ['Delhi', 'New Delhi'],
  'mumbai': ['Mumbai', 'Bombay'],
  'bangalore': ['Bangalore', 'Bengaluru'],
  'bengaluru': ['Bengaluru', 'Bangalore'],
  'chennai': ['Chennai', 'Madras'],
  'kolkata': ['Kolkata', 'Calcutta'],
  'hyderabad': ['Hyderabad'],
  'pune': ['Pune'],
  'ahmedabad': ['Ahmedabad'],
  'jaipur': ['Jaipur'],
  'lucknow': ['Lucknow'],
  'chandigarh': ['Chandigarh'],
  'kochi': ['Kochi', 'Cochin'],
  'guwahati': ['Guwahati'],
};

function extractLocation(queryText) {
  const t = queryText.toLowerCase();
  for (const [key, variants] of Object.entries(INDIA_CITIES)) {
    if (t.includes(key)) return variants[0];
  }
  // check any country
  for (const entry of COUNTRY_MAP) {
    for (const k of entry.keys) {
      if (t.includes(k)) {
        // return the matched keyword capitalized as location hint
        return k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }
  return ''; // no location restriction
}

// ─── FIELD DETECTION ─────────────────────────────────────────────────────────
// Comprehensive list covering all creative/design disciplines
const FIELD_RULES = [
  { keys: ['fashion design', 'fashion designer', 'fashion stylist', 'apparel designer', 'costume design', 'garment design', 'womenswear', 'menswear', 'couture'], label: 'Fashion Design' },
  { keys: ['textile', 'fabric design', 'weaving', 'knitting pattern', 'surface design'], label: 'Textile Design' },
  { keys: ['visual art', 'fine art', 'fine arts', 'painting', 'sculptor', 'sculpture', 'printmaking', 'ceramics', 'art teacher', 'art instructor', 'studio art'], label: 'Visual / Fine Art' },
  { keys: ['architect', 'architecture', 'architectural designer', 'bim'], label: 'Architecture' },
  { keys: ['interior design', 'interior designer', 'space designer', 'interior decorator', 'set designer'], label: 'Interior Design' },
  { keys: ['graphic design', 'graphic designer', 'visual designer', 'brand designer', 'identity designer', 'print designer'], label: 'Graphic Design' },
  { keys: ['ui/ux', 'ui ux', 'ux designer', 'ui designer', 'user experience', 'user interface', 'product designer', 'interaction design', 'hci'], label: 'UI/UX Design' },
  { keys: ['animation', 'animator', '3d artist', '2d artist', '3d designer', 'vfx', 'visual effects', 'rigging', 'motion capture', 'character design', 'character artist'], label: 'Animation / 2D / 3D Art' },
  { keys: ['photograph', 'photographer', 'photo editor', 'photojournalist', 'commercial photographer', 'videographer', 'cinematographer'], label: 'Photography & Film' },
  { keys: ['digital art', 'digital artist', 'concept artist', 'digital illustrat', 'nft artist'], label: 'Digital Art' },
  { keys: ['product design', 'industrial design', 'industrial designer', 'product developer'], label: 'Product / Industrial Design' },
  { keys: ['illustrat', 'illustrator', 'book illustrat'], label: 'Illustration' },
  { keys: ['motion graphic', 'motion design', 'motion designer', 'after effects', 'motion artist'], label: 'Motion Graphics' },
  { keys: ['jewellery', 'jewelry', 'jewel design', 'accessory design', 'goldsmith'], label: 'Jewellery Design' },
  { keys: ['handicraft', 'craft design', 'artisan', 'craft artist', 'pottery', 'weav', 'embroidery', 'dhokra', 'applique', 'pattachitra'], label: 'Handicraft / Craft Design' },
  { keys: ['makeup', 'make-up', 'makeup artist', 'mua', 'beauty artist', 'sfx makeup', 'hair and makeup', 'cosmetology'], label: 'Makeup & Beauty Art' },
  { keys: ['game design', 'game designer', 'game artist', 'level designer', 'environment artist', 'game developer'], label: 'Game Design & Art' },
  { keys: ['web design', 'web designer', 'frontend design', 'web developer designer'], label: 'Web Design' },
  { keys: ['packaging design', 'packaging designer', 'package design'], label: 'Packaging Design' },
  { keys: ['typography', 'type design', 'typeface', 'font designer', 'lettering'], label: 'Typography & Lettering' },
  { keys: ['art director', 'creative director', 'design director', 'head of design', 'chief creative'], label: 'Art / Creative Direction' },
  { keys: ['exhibition design', 'museum design', 'display design', 'curation', 'curator'], label: 'Exhibition & Curation' },
  { keys: ['landscape design', 'landscape architect', 'urban design', 'urban planner'], label: 'Landscape / Urban Design' },
  { keys: ['sound design', 'audio design', 'music production', 'composer'], label: 'Sound & Music Design' },
  { keys: ['furniture design', 'furniture designer', 'woodwork designer', 'cabinet maker'], label: 'Furniture Design' },
  { keys: ['brand', 'branding', 'brand identity', 'brand strategist'], label: 'Branding & Identity' },
];

function detectField(text) {
  const t = text.toLowerCase();
  for (const rule of FIELD_RULES) {
    if (rule.keys.some(k => t.includes(k))) return rule.label;
  }
  return 'Design & Art';
}

// ─── BUILD ADZUNA SEARCH TERMS ────────────────────────────────────────────────
// All creative disciplines joined — Adzuna supports OR-style multi-term queries
const ALL_DISCIPLINES = [
  'fashion designer', 'textile designer', 'fine artist', 'architect',
  'interior designer', 'graphic designer', 'ux designer', 'ui designer',
  'animator', '3d artist', '2d artist', 'vfx artist', 'photographer',
  'videographer', 'digital artist', 'concept artist', 'illustrator',
  'product designer', 'industrial designer', 'motion graphic designer',
  'jewellery designer', 'handicraft artisan', 'makeup artist', 'beauty artist',
  'game designer', 'game artist', 'web designer', 'packaging designer',
  'art director', 'creative director', 'exhibition designer', 'curator',
  'landscape architect', 'urban designer', 'furniture designer',
  'brand designer', 'branding designer', 'visual artist', 'sculpture artist',
  'ceramics artist', 'printmaking artist', 'character designer', 'mural artist',
  'calligrapher', 'lettering artist', 'typography designer', 'painter',
  'art teacher', 'costume designer', 'surface designer'
];

// ─── POST /api/search — AI chatbot endpoint ──────────────────────────────────
app.post('/api/search', async (req, res) => {
  const { q, field, type } = req.body;
  const rawQuery = q || field || 'designer';
  const qLower = rawQuery.toLowerCase();

  const { code: countryCode, label: countryLabel } = getCountryInfo(rawQuery);
  const location = extractLocation(rawQuery);

  // Determine what to search: specific field from query OR all disciplines
  const searchWhat = field
    ? field
    : (qLower.includes('all') || qLower.includes('any') || !rawQuery.trim())
      ? ALL_DISCIPLINES.slice(0, 10).join(' OR ')
      : rawQuery;

  let allJobs = [];

  // ── 1. Adzuna ───────────────────────────────────────────────────────────────
  try {
    const params = {
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      what: searchWhat,
      results_per_page: 20,
      'content-type': 'application/json'
    };
    if (location) params.where = location;

    const adzunaRes = await axios.get(
      `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`,
      { params }
    );

    const adzunaJobs = adzunaRes.data.results.map(job => ({
      id: 'adz_' + job.id,
      title: job.title,
      org: job.company.display_name,
      location: job.location.display_name,
      desc: (job.description || '').slice(0, 250) + '...',
      link: job.redirect_url,
      deadline: 'Rolling',
      posted: new Date(job.created).toLocaleDateString('en-IN'),
      startDate: 'Immediate',
      type: job.contract_time || 'Full-time',
      salary: job.salary_min
        ? `${job.salary_min}–${job.salary_max || '?'} ${job.salary_is_predicted ? '(est.)' : ''}`.trim()
        : null,
      field: detectField(job.title + ' ' + job.description),
      src: 'adzuna',
      srcLabel: 'Adzuna',
      country: countryLabel,
      odisha: (job.location.display_name || '').toLowerCase().includes('odisha'),
      verified: true,
      aiFound: true
    }));
    allJobs.push(...adzunaJobs);
  } catch (e) {
    console.error('[Adzuna ERROR]', e.message);
  }

  // ── 2. data.gov.in — India govt jobs (Odisha focus + national) ────────────
  if (countryCode === 'in') {
    try {
      const stateFilter = location.toLowerCase().includes('odisha') || !location
        ? 'Odisha'
        : location;

      const govtRes = await axios.get(
        `https://api.data.gov.in/resource/9115b89c-7d84-4b4f-b3a8-42b7b9c3f3b2`,
        {
          params: {
            'api-key': DATA_GOV_API_KEY,
            format: 'json',
            'filters[state]': stateFilter,
            limit: 20
          }
        }
      );

      const govtJobs = (govtRes.data.records || [])
        .filter(job => {
          const title = (job.title || job.department || job.ministry || '').toLowerCase();
          // Accept any creative/cultural/design-related role
          return FIELD_RULES.some(rule => rule.keys.some(k => title.includes(k))) ||
            title.includes('art') || title.includes('craft') ||
            title.includes('culture') || title.includes('museum') ||
            title.includes('heritage') || title.includes('design');
        })
        .map(job => ({
          id: 'govt_' + Math.random().toString(36).substr(2, 9),
          title: job.title || 'Government Creative Position',
          org: job.department || job.ministry || `Govt of ${stateFilter}`,
          location: `${stateFilter}, India`,
          desc: job.description || 'Government vacancy. Visit official portal for details.',
          link: job.url || 'https://odisha.gov.in',
          deadline: job.last_date || 'See portal',
          posted: job.published_date || 'Recent',
          startDate: 'As per notification',
          type: 'Government Post',
          salary: job.pay_scale || null,
          field: detectField(job.title || ''),
          src: 'datagov',
          srcLabel: 'data.gov.in',
          country: 'India',
          odisha: stateFilter.toLowerCase().includes('odisha'),
          verified: true,
          aiFound: true
        }));
      allJobs.push(...govtJobs);
    } catch (e) {
      console.error('[data.gov.in ERROR]', e.message);
    }
  }

  res.json({
    jobs: allJobs,
    total: allJobs.length,
    country: countryLabel,
    location: location || 'All regions',
    advice: `Found ${allJobs.length} creative jobs in ${location || countryLabel}. Sources: Adzuna${countryCode === 'in' ? ', data.gov.in' : ''}.`,
    sourcesSearched: countryCode === 'in' ? ['Adzuna', 'data.gov.in'] : ['Adzuna'],
    searchTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });
});

// ─── GET /api/jobs — HTML frontend endpoint ───────────────────────────────────
app.get('/api/jobs', async (req, res) => {
  const q = req.query.q || '';
  const field = req.query.field || '';
  const locationParam = req.query.location || '';
  const disciplineParam = req.query.discipline || '';

  // Combine hints for country/location detection
  const locationHint = [locationParam, q, field, disciplineParam].join(' ');
  const { code: countryCode, label: countryLabel } = getCountryInfo(locationHint);
  const location = locationParam || extractLocation(locationHint);

  // Build search term
  let searchWhat;
  if (disciplineParam) {
    searchWhat = disciplineParam;
  } else if (q) {
    searchWhat = q;
  } else if (field) {
    searchWhat = field;
  } else {
    // Broad creative sweep — pick 8 disciplines to stay within Adzuna query limits
    searchWhat = ALL_DISCIPLINES.slice(0, 8).join(' OR ');
  }

  let allJobs = [];

  // ── Adzuna ──────────────────────────────────────────────────────────────────
  try {
    const params = {
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      what: searchWhat,
      results_per_page: 20,
      'content-type': 'application/json'
    };
    if (location) params.where = location;

    const adzunaRes = await axios.get(
      `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`,
      { params }
    );

    const adzunaJobs = adzunaRes.data.results.map(job => ({
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
      salary: job.salary_min
        ? `${job.salary_min}–${job.salary_max || '?'}${job.salary_is_predicted ? ' (est.)' : ''}`
        : null,
      field: detectField(job.title + ' ' + job.description),
      src: 'adzuna',
      srcLabel: 'Adzuna',
      country: countryLabel,
      odisha: (job.location.display_name || '').toLowerCase().includes('odisha'),
      verified: true
    }));
    allJobs.push(...adzunaJobs);
  } catch (e) {
    console.error('[Adzuna ERROR]', e.message);
  }

  // ── data.gov.in (India only) ─────────────────────────────────────────────
  if (countryCode === 'in') {
    const stateFilter = location.toLowerCase().includes('odisha') || !location
      ? 'Odisha'
      : location;

    try {
      const govtRes = await axios.get(
        `https://api.data.gov.in/resource/9115b89c-7d84-4b4f-b3a8-42b7b9c3f3b2`,
        {
          params: {
            'api-key': DATA_GOV_API_KEY,
            format: 'json',
            'filters[state]': stateFilter,
            limit: 20
          }
        }
      );

      const govtJobs = (govtRes.data.records || [])
        .filter(job => {
          const title = (job.title || job.department || job.ministry || '').toLowerCase();
          return FIELD_RULES.some(rule => rule.keys.some(k => title.includes(k))) ||
            title.includes('art') || title.includes('craft') ||
            title.includes('culture') || title.includes('museum') ||
            title.includes('heritage') || title.includes('design');
        })
        .map(job => ({
          id: 'govt_' + Math.random().toString(36).substr(2, 9),
          title: job.title || 'Government Creative Position',
          org: job.department || job.ministry || `Govt of ${stateFilter}`,
          location: `${stateFilter}, India`,
          desc: job.description || 'Government vacancy. Visit official portal for details.',
          link: job.url || 'https://odisha.gov.in',
          deadline: job.last_date || 'See portal',
          posted: job.published_date || new Date().toISOString().split('T')[0],
          startDate: 'As per notification',
          type: 'Government Post',
          salary: job.pay_scale || null,
          field: detectField(job.title || ''),
          src: 'datagov',
          srcLabel: 'data.gov.in',
          country: 'India',
          odisha: stateFilter.toLowerCase().includes('odisha'),
          verified: true
        }));
      allJobs.push(...govtJobs);
    } catch (e) {
      console.error('[data.gov.in ERROR]', e.message);
    }
  }

  res.json(allJobs);
});

// ─── GET /api/disciplines — list of all supported creative fields ─────────────
app.get('/api/disciplines', (req, res) => {
  res.json(FIELD_RULES.map(r => r.label));
});

// ─── GET /api/countries — list of all supported countries ────────────────────
app.get('/api/countries', (req, res) => {
  const countries = COUNTRY_MAP
    .filter(c => c.label !== 'India') // India handled separately
    .map(c => ({ code: c.code, label: c.label }));
  countries.push({ code: 'in', label: 'India' });
  res.json(countries);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ ODA Portal Server running on port ${PORT}`)
);

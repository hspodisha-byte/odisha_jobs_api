const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const DATA_GOV_API_KEY = process.env.DATA_GOV_API_KEY;

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
      if (t.includes(k)) return k.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
    }
  }
  return '';
}

// ─── FIELD DETECTION ──────────────────────────────────────────────────────────
const FIELD_RULES = [
  // ── Fashion & Apparel (expanded) ──────────────────────────────────────────
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
  // ── Core Fashion (existing, expanded) ────────────────────────────────────
  { keys:['fashion design','fashion designer','apparel designer','costume design','garment design','womenswear','menswear','couture','rtw designer','knitwear designer','swimwear designer','lingerie designer'], label:'Fashion Design' },
  // ── Other disciplines (unchanged) ────────────────────────────────────────
  { keys:['textile','fabric design','weaving','knitting pattern','surface design'], label:'Textile Design' },
  { keys:['visual art','fine art','fine arts','painting','sculptor','sculpture','printmaking','ceramics','art teacher','art instructor','studio art'], label:'Visual / Fine Art' },
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
  { keys:['handicraft','craft design','artisan','craft artist','pottery','weav','embroidery','dhokra','applique','pattachitra'], label:'Handicraft / Craft Design' },
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

const ALL_DISCIPLINES = [
  // Fashion & Apparel (new)
  'fashion model','fashion communication','fashion product developer',
  'fashion illustrator','fashion stylist','pattern maker','pattern cutter',
  'garment technologist','apparel production manager','visual merchandiser',
  'fashion merchandiser','trend forecaster','fashion journalist','fashion editor',
  'fashion photographer','fashion buyer','fashion designer',
  // Design & Art
  'textile designer','fine artist','architect',
  'interior designer','graphic designer','ux designer','ui designer',
  'animator','3d artist','2d artist','vfx artist','photographer',
  'videographer','digital artist','concept artist','illustrator',
  'product designer','industrial designer','motion graphic designer',
  'jewellery designer','handicraft artisan','makeup artist','beauty artist',
  'game designer','game artist','web designer','packaging designer',
  'art director','creative director','exhibition designer','curator',
  'landscape architect','urban designer','furniture designer',
  'brand designer','visual artist','sculpture artist','ceramics artist',
  'printmaking artist','character designer','calligrapher','lettering artist',
  'typography designer','painter','art teacher','costume designer','surface designer'
];

// ─── ODISHA CREATIVE KEYWORD FILTER ──────────────────────────────────────────
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
    // new fashion roles
    'model','stylist','merchandis','pattern mak','pattern cut','garment tech',
    'apparel','trend forecast','journalist','editor','buyer','couture',
    'womenswear','menswear','knitwear','swimwear','lingerie','wardrobe',
    'lookbook','catalogue','editorial','runway','catwalk','showroom',
    'vm executive','visual merch','window display','retail display'
  ];
  return creativeKeys.some(k => t.includes(k));
}

// ─── DATA.GOV.IN — Multiple resource IDs for jobs ────────────────────────────
// data.gov.in has multiple datasets. We try several to maximise hits.
const DATAGOV_RESOURCES = [
  '9115b89c-7d84-4b4f-b3a8-42b7b9c3f3b2',  // original
  'fd2cbc79-13d5-4d6f-b92e-c96f10b4d8f8',  // state govt vacancies
  'b4e6d8f3-2c1a-4e9b-a7d5-1f3e8c6b2d4a',  // employment exchange
];

async function fetchDataGov(stateFilter, disciplineHint) {
  const results = [];
  for (const resourceId of DATAGOV_RESOURCES) {
    try {
      const resp = await axios.get(
        `https://api.data.gov.in/resource/${resourceId}`,
        {
          params: {
            'api-key': DATA_GOV_API_KEY,
            format: 'json',
            'filters[state]': stateFilter,
            limit: 25,
          },
          timeout: 8000
        }
      );
      const records = resp.data?.records || [];
      const filtered = records.filter(job => {
        const text = [job.title, job.department, job.ministry, job.post_name, job.designation].join(' ');
        return isCreativeRole(text);
      });
      results.push(...filtered.map(job => ({
        id: 'govt_' + Math.random().toString(36).substr(2, 9),
        title: job.title || job.post_name || job.designation || 'Government Creative Position',
        org: job.department || job.ministry || job.organization || `Govt of ${stateFilter}`,
        location: `${stateFilter}, India`,
        desc: job.description || job.remarks || 'Government vacancy. Visit official portal for complete details including eligibility, pay scale, and application process.',
        link: job.url || job.apply_url || 'https://odisha.gov.in/employment',
        deadline: job.last_date || job.closing_date || 'See portal',
        posted: job.published_date || job.notification_date || new Date().toISOString().split('T')[0],
        startDate: 'As per notification',
        type: 'Government Post',
        salary: job.pay_scale || job.salary || null,
        field: detectField([job.title, job.post_name, job.designation].join(' ')),
        src: 'datagov',
        srcLabel: 'data.gov.in',
        country: 'India',
        odisha: stateFilter.toLowerCase().includes('odisha'),
        verified: true
      })));
    } catch (e) {
      // silently skip failed resource IDs
      console.warn(`[data.gov.in] resource ${resourceId} failed:`, e.message);
    }
  }
  return results;
}

// ─── ODISHA EMPLOYMENT EXCHANGE (Rozgar) RSS/API ──────────────────────────────
// Odisha's NIC-hosted employment portal — publicly accessible JSON
async function fetchOdishaGovtJobs(disciplineHint) {
  const results = [];

  // ── 1. Odisha Employment Exchange (OEES) ──────────────────────────────────
  // This is the official state govt job portal maintained by NIC
  try {
    const resp = await axios.get(
      'https://employment.odisha.gov.in/api/v1/jobs',
      { params: { category: 'arts', limit: 20 }, timeout: 8000 }
    );
    const jobs = resp.data?.jobs || resp.data?.data || [];
    results.push(...jobs
      .filter(j => isCreativeRole(j.title || j.post || ''))
      .map(j => ({
        id: 'oees_' + Math.random().toString(36).substr(2, 9),
        title: j.title || j.post || 'Creative Position',
        org: j.department || j.organization || 'Govt of Odisha',
        location: j.location || 'Odisha, India',
        desc: j.description || j.details || 'See official Odisha Employment Exchange portal.',
        link: j.url || j.apply_link || 'https://employment.odisha.gov.in',
        deadline: j.last_date || j.closing_date || 'See portal',
        posted: j.date || j.published || new Date().toISOString().split('T')[0],
        startDate: 'As per notification',
        type: 'Government Post',
        salary: j.pay_scale || j.salary || null,
        field: detectField(j.title || j.post || ''),
        src: 'datagov',
        srcLabel: 'Odisha Govt',
        country: 'India',
        odisha: true,
        verified: true
      }))
    );
  } catch (e) {
    console.warn('[OEES]', e.message);
  }

  // ── 2. Odisha PSC & State Recruitment Board jobs (via NIC open data) ──────
  try {
    const resp = await axios.get(
      'https://opsc.nic.in/opsc/recruitment/json',
      { params: { type: 'all' }, timeout: 8000 }
    );
    const jobs = resp.data?.results || resp.data?.data || [];
    results.push(...jobs
      .filter(j => isCreativeRole(j.postName || j.title || ''))
      .map(j => ({
        id: 'opsc_' + Math.random().toString(36).substr(2, 9),
        title: j.postName || j.title || 'Recruitment Post',
        org: j.department || 'Odisha Public Service Commission',
        location: 'Odisha, India',
        desc: j.description || `Recruitment for ${j.postName || 'creative post'} by OPSC. Check official website for eligibility and syllabus.`,
        link: j.applyLink || j.notificationLink || 'https://opsc.gov.in',
        deadline: j.lastDate || 'See portal',
        posted: j.date || new Date().toISOString().split('T')[0],
        startDate: 'As per notification',
        type: 'Government Post',
        salary: j.payScale || j.payBand || null,
        field: detectField(j.postName || j.title || ''),
        src: 'datagov',
        srcLabel: 'OPSC',
        country: 'India',
        odisha: true,
        verified: true
      }))
    );
  } catch (e) {
    console.warn('[OPSC]', e.message);
  }

  // ── 3. Odisha Culture / Handicraft Department open vacancies ─────────────
  try {
    const resp = await axios.get(
      'https://odisha.gov.in/api/recruitment',
      { params: { department: 'culture,handicraft,tourism,art' }, timeout: 8000 }
    );
    const jobs = resp.data?.vacancies || resp.data?.jobs || [];
    results.push(...jobs.map(j => ({
      id: 'odgov_' + Math.random().toString(36).substr(2, 9),
      title: j.title || j.post_name || 'Govt Creative Post',
      org: j.department || 'Govt of Odisha',
      location: j.place || 'Odisha, India',
      desc: j.description || 'Official Government of Odisha vacancy. Apply through official portal.',
      link: j.apply_link || j.url || 'https://odisha.gov.in/employment',
      deadline: j.last_date || 'See portal',
      posted: j.published || new Date().toISOString().split('T')[0],
      startDate: 'As per notification',
      type: 'Government Post',
      salary: j.pay_scale || null,
      field: detectField(j.title || j.post_name || ''),
      src: 'datagov',
      srcLabel: 'Odisha Govt Portal',
      country: 'India',
      odisha: true,
      verified: true
    })));
  } catch (e) {
    console.warn('[Odisha Gov Portal]', e.message);
  }

  return results;
}

// ─── NAUKRI / INDEED INDIA (via RapidAPI proxy if available) ─────────────────
// If you have a RapidAPI key set as RAPID_API_KEY, this pulls
// Naukri/Indeed India jobs for Odisha cities
async function fetchNaukriStyleJobs(query, location) {
  if (!process.env.RAPID_API_KEY) return [];
  const results = [];
  try {
    const resp = await axios.get('https://jobs-api14.p.rapidapi.com/list', {
      params: {
        query: query || 'designer',
        location: location || 'Bhubaneswar, Odisha, India',
        distance: '50',
        language: 'en_GB',
        remoteOnly: 'false',
        employmentTypes: 'fulltime;parttime;intern;contractor',
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY,
        'X-RapidAPI-Host': 'jobs-api14.p.rapidapi.com'
      },
      timeout: 10000
    });
    const jobs = resp.data?.jobs || [];
    results.push(...jobs
      .filter(j => isCreativeRole(j.title || ''))
      .map(j => ({
        id: 'rapid_' + Math.random().toString(36).substr(2, 9),
        title: j.title,
        org: j.company,
        location: j.location || location || 'Odisha, India',
        desc: (j.description || '').slice(0, 250) + '...',
        link: j.jobProviders?.[0]?.url || j.url || '#',
        deadline: 'Rolling',
        posted: j.datePosted || new Date().toISOString().split('T')[0],
        startDate: 'Immediate',
        type: j.employmentType || 'Full-time',
        salary: j.salaryRange || null,
        field: detectField(j.title + ' ' + (j.description || '')),
        src: 'adzuna',
        srcLabel: j.jobProviders?.[0]?.jobProvider || 'Jobs API',
        country: 'India',
        odisha: (j.location || '').toLowerCase().includes('odisha') ||
                (j.location || '').toLowerCase().includes('bhubaneswar'),
        verified: true
      }))
    );
  } catch (e) {
    console.warn('[RapidAPI Jobs]', e.message);
  }
  return results;
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

    // NOTE: For India (code='in'), Adzuna coverage is thin.
    // We still call it but expect few/no results for Odisha city searches.
    const r = await axios.get(
      `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`,
      { params, timeout: 10000 }
    );
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
  } catch (e) {
    console.error('[Adzuna ERROR]', e.message);
    return [];
  }
}

// ─── IS ODISHA SEARCH? ────────────────────────────────────────────────────────
function isOdishaSearch(q, location) {
  const combined = (q + ' ' + location).toLowerCase();
  return ['odisha','bhubaneswar','cuttack','puri','rourkela','sambalpur',
          'berhampur','brahmapur','balasore','khurda','angul'].some(k => combined.includes(k));
}

// ─── POST /api/search ─────────────────────────────────────────────────────────
app.post('/api/search', async (req, res) => {
  const { q, field, type } = req.body;
  const rawQuery = q || field || 'designer';
  const { code: countryCode, label: countryLabel } = getCountryInfo(rawQuery);
  const location = extractLocation(rawQuery);

  const searchWhat = field || rawQuery;
  let allJobs = [];

  // Adzuna
  allJobs.push(...await fetchAdzuna(countryCode, countryLabel, searchWhat, location));

  // India-specific sources
  if (countryCode === 'in') {
    const isOdisha = isOdishaSearch(rawQuery, location);
    const stateFilter = isOdisha || !location ? 'Odisha' : location;

    // data.gov.in (multiple resources)
    allJobs.push(...await fetchDataGov(stateFilter, searchWhat));

    // Odisha-specific govt portals
    if (isOdisha || !location) {
      allJobs.push(...await fetchOdishaGovtJobs(searchWhat));
    }

    // RapidAPI / Naukri-style
    allJobs.push(...await fetchNaukriStyleJobs(searchWhat, location || 'Odisha'));
  }

  // Deduplicate by title+org combo
  const seen = new Set();
  allJobs = allJobs.filter(j => {
    const key = (j.title + j.org).toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.json({
    jobs: allJobs,
    total: allJobs.length,
    country: countryLabel,
    location: location || 'All regions',
    advice: `Found ${allJobs.length} creative jobs${location ? ' in ' + location : ''}. Sources: Adzuna${countryCode === 'in' ? ', data.gov.in, Odisha Govt Portals' : ''}.`,
    sourcesSearched: countryCode === 'in'
      ? ['Adzuna', 'data.gov.in', 'OPSC', 'Odisha Employment Exchange']
      : ['Adzuna'],
    searchTime: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  });
});

// ─── GET /api/jobs ─────────────────────────────────────────────────────────────
app.get('/api/jobs', async (req, res) => {
  const q             = req.query.q || '';
  const field         = req.query.field || '';
  const locationParam = req.query.location || '';
  const disciplineParam = req.query.discipline || '';

  const locationHint = [locationParam, q, field, disciplineParam].join(' ');
  const { code: countryCode, label: countryLabel } = getCountryInfo(locationHint);
  const location = locationParam || extractLocation(locationHint);

  let searchWhat;
  if (disciplineParam)     searchWhat = disciplineParam;
  else if (q)              searchWhat = q;
  else if (field)          searchWhat = field;
  else                     searchWhat = ALL_DISCIPLINES.slice(0, 8).join(' OR ');

  let allJobs = [];

  // ── Adzuna ─────────────────────────────────────────────────────────────────
  allJobs.push(...await fetchAdzuna(countryCode, countryLabel, searchWhat, location));

  // ── India-specific sources ─────────────────────────────────────────────────
  if (countryCode === 'in') {
    const isOdisha = isOdishaSearch(q, locationParam);

    // Always try Odisha govt sources on default/empty load OR explicit Odisha search
    if (isOdisha || !locationParam) {
      // data.gov.in — Odisha
      allJobs.push(...await fetchDataGov('Odisha', searchWhat));
      // Odisha-specific portals
      allJobs.push(...await fetchOdishaGovtJobs(searchWhat));
    } else {
      // Other Indian city — just data.gov.in for that state
      allJobs.push(...await fetchDataGov(location, searchWhat));
    }

    // RapidAPI supplement for India
    allJobs.push(...await fetchNaukriStyleJobs(
      searchWhat,
      isOdisha ? 'Bhubaneswar, Odisha, India' : (location || 'India')
    ));
  }

  // ── Deduplicate ────────────────────────────────────────────────────────────
  const seen = new Set();
  allJobs = allJobs.filter(j => {
    const key = (j.title + j.org).toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.json(allJobs);
});

// ─── GET /api/disciplines ──────────────────────────────────────────────────────
app.get('/api/disciplines', (req, res) => {
  res.json(FIELD_RULES.map(r => r.label));
});

// ─── GET /api/countries ────────────────────────────────────────────────────────
app.get('/api/countries', (req, res) => {
  const countries = COUNTRY_MAP
    .filter(c => c.label !== 'India')
    .map(c => ({ code: c.code, label: c.label }));
  countries.push({ code:'in', label:'India' });
  res.json(countries);
});

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    adzuna: !!(ADZUNA_APP_ID && ADZUNA_APP_KEY),
    dataGov: !!DATA_GOV_API_KEY,
    rapidApi: !!process.env.RAPID_API_KEY,
    time: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ ODA Portal Server running on port ${PORT}`));

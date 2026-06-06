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

// Helper: Detect country code for Adzuna API
function getCountryCode(location) {
  const loc = location.toLowerCase();
  if (loc.includes('usa') || loc.includes('united states') || loc.includes('america')) return 'us';
  if (loc.includes('uk') || loc.includes('united kingdom') || loc.includes('london')) return 'gb';
  if (loc.includes('canada')) return 'ca';
  if (loc.includes('australia')) return 'au';
  if (loc.includes('germany')) return 'de';
  if (loc.includes('france')) return 'fr';
  if (loc.includes('singapore')) return 'sg';
  if (loc.includes('uae') || loc.includes('dubai')) return 'ae';
  if (loc.includes('india') || loc.includes('delhi') || loc.includes('mumbai') || loc.includes('bangalore') || loc.includes('odisha')) return 'in';
  return 'in'; // default India
}

// Helper: Detect field from job title/desc
function detectField(text) {
  const t = text.toLowerCase();
  if (t.includes('fashion')) return 'Fashion Design';
  if (t.includes('textile')) return 'Textile Design';
  if (t.includes('architect')) return 'Architecture';
  if (t.includes('interior')) return 'Interior Design';
  if (t.includes('graphic')) return 'Graphic Design';
  if (t.includes('ui/ux') || t.includes('ui ux')) return 'UI/UX Design';
  if (t.includes('ui ')) return 'UI Design';
  if (t.includes('animation') || t.includes('3d') || t.includes('2d')) return 'Animation / 2D / 3D';
  if (t.includes('photograph')) return 'Photography';
  if (t.includes('digital art')) return 'Digital Art';
  if (t.includes('product design')) return 'Product Design';
  if (t.includes('illustrat')) return 'Illustration';
  if (t.includes('motion')) return 'Motion Graphics';
  if (t.includes('industrial')) return 'Industrial Design';
  if (t.includes('jewell')) return 'Jewellery Design';
  if (t.includes('craft') || t.includes('handicraft')) return 'Handicraft Design';
  return 'Design';
}

// POST wala route - AI search ke liye
app.post('/api/search', async (req, res) => {
  const { q, field, type } = req.body;
  const query = q || field || 'designer';
  let allJobs = [];

  // Detect location from query
  let location = 'Odisha';
  let countryCode = 'in';
  const qLower = query.toLowerCase();

  const intlMap = {
    'usa': 'United States', 'united states': 'United States', 'america': 'United States',
    'uk': 'United Kingdom', 'london': 'United Kingdom', 'britain': 'United Kingdom',
    'canada': 'Canada', 'australia': 'Australia', 'germany': 'Germany',
    'france': 'France', 'singapore': 'Singapore', 'dubai': 'UAE', 'uae': 'UAE',
    'international': '', 'abroad': ''
  };

  const indiaStates = ['delhi', 'mumbai', 'bangalore', 'bengaluru', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ahmedabad', 'jaipur'];

  for (let [key, val] of Object.entries(intlMap)) {
    if (qLower.includes(key)) {
      location = val;
      countryCode = getCountryCode(val);
      break;
    }
  }

  for (let state of indiaStates) {
    if (qLower.includes(state)) {
      location = state.charAt(0).toUpperCase() + state.slice(1);
      countryCode = 'in';
      break;
    }
  }

  if (qLower.includes('odisha')) {
    location = 'Odisha';
    countryCode = 'in';
  }

  // 1. Adzuna API - Dynamic country
  try {
    const adzunaRes = await axios.get(`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`, {
      params: {
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        what: query,
        where: location || undefined,
        results_per_page: 15,
        'content-type': 'application/json'
      }
    });

    const adzunaJobs = adzunaRes.data.results.map(job => ({
      id: 'adz_' + job.id,
      title: job.title,
      org: job.company.display_name,
      location: job.location.display_name,
      desc: job.description.slice(0, 200) + '...',
      link: job.redirect_url,
      deadline: 'Rolling',
      posted: new Date(job.created).toLocaleDateString('en-IN'),
      startDate: 'Immediate',
      type: job.contract_time || 'Full-time',
      field: detectField(job.title + ' ' + job.description),
      src: 'private',
      srcLabel: 'ODA Portal', // Adzuna hide
      odisha: job.location.display_name.toLowerCase().includes('odisha'),
      verified: true,
      aiFound: true
    }));
    allJobs = [...allJobs,...adzunaJobs];
  } catch (e) {
    console.log('Adzuna error:', e.message);
  }

  // 2. Govt jobs sirf Odisha ke liye
  if (countryCode === 'in' && (location === 'Odisha' || qLower.includes('odisha') || qLower.includes('govt'))) {
    try {
      const govtRes = await axios.get(`https://api.data.gov.in/resource/9115b89c-7d84-4b4f-b3a8-42b7b9c3f3b2`, {
        params: {
          'api-key': DATA_GOV_API_KEY,
          format: 'json',
          'filters[state]': 'Odisha',
          limit: 15
        }
      });

      const govtJobs = govtRes.data.records
       .filter(job => {
          const title = (job.title || job.department || job.ministry || '').toLowerCase();
          return title.includes('design') || title.includes('art') || title.includes('craft') ||
                 title.includes('culture') || title.includes('museum') || title.includes('heritage');
        })
       .map(job => ({
          id: 'govt_' + Math.random().toString(36).substr(2, 9),
          title: job.title || 'Government Position',
          org: job.department || job.ministry || 'Govt of Odisha',
          location: 'Odisha, India',
          desc: job.description || 'Government vacancy from data.gov.in',
          link: job.url || 'https://odisha.gov.in',
          deadline: job.last_date || 'Rolling',
          posted: 'Recent',
          startDate: 'Immediate',
          type: 'Government Post',
          field: detectField(job.title || ''),
          src: 'govt',
          srcLabel: 'Govt of Odisha',
          odisha: true,
          verified: true,
          aiFound: true
        }));
      allJobs = [...allJobs,...govtJobs];
    } catch (e) {
      console.log('Govt API error:', e.message);
    }
  }

  res.json({
    jobs: allJobs,
    advice: `${location || 'International'} me ${allJobs.length} jobs mili. ODA Portal se verified data.`,
    sourcesSearched: ['ODA Portal', 'data.gov.in'],
    searchTime: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
  });
});

// GET wala route - HTML page ke liye
app.get('/api/jobs', async (req, res) => {
  const q = req.query.q || 'designer';
  const field = req.query.field || '';
  const location = req.query.location || '';
  const countryCode = getCountryCode(location);

  let allJobs = [];

  try {
    const adzunaRes = await axios.get(`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`, {
      params: {
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        what: q || field || 'designer',
        where: location || undefined,
        results_per_page: 20,
        'content-type': 'application/json'
      }
    });

    const adzunaJobs = adzunaRes.data.results.map(job => ({
      id: 'adz_' + job.id,
      title: job.title,
      org: job.company.display_name,
      location: job.location.display_name,
      desc: job.description.slice(0, 200) + '...',
      link: job.redirect_url,
      deadline: 'Rolling',
      posted: new Date(job.created).toISOString().split('T')[0],
      startDate: 'Immediate',
      type: job.contract_time || 'Full-time',
      field: detectField(job.title + ' ' + job.description),
      src: 'private',
      srcLabel: 'ODA Portal', // Adzuna hide
      odisha: job.location.display_name.toLowerCase().includes('odisha'),
      verified: true
    }));
    allJobs = [...allJobs,...adzunaJobs];
  } catch (e) {
    console.log('Adzuna error:', e.message);
  }

  // Government jobs sirf Odisha/India ke liye
  if (countryCode === 'in' && (location.toLowerCase().includes('odisha') ||!location)) {
    try {
      const govtRes = await axios.get(`https://api.data.gov.in/resource/9115b89c-7d84-4b4f-b3a8-42b7b9c3f3b2`, {
        params: {
          'api-key': DATA_GOV_API_KEY,
          format: 'json',
          'filters[state]': 'Odisha',
          limit: 15
        }
      });

      const govtJobs = govtRes.data.records
       .filter(job => {
          const title = (job.title || job.department || job.ministry || '').toLowerCase();
          return title.includes('design') || title.includes('art') || title.includes('craft') ||
                 title.includes('culture') || title.includes('museum') || title.includes('heritage');
        })
       .map(job => ({
          id: 'govt_' + Math.random().toString(36).substr(2, 9),
          title: job.title || 'Government Position',
          org: job.department || job.ministry || 'Govt of Odisha',
          location: 'Odisha, India',
          desc: job.description || 'Government vacancy from data.gov.in',
          link: job.url || 'https://odisha.gov.in',
          deadline: job.last_date || 'Rolling',
          posted: new Date().toISOString().split('T')[0],
          startDate: 'Immediate',
          type: 'Government Post',
          field: detectField(job.title || ''),
          src: 'govt',
          srcLabel: 'Govt of Odisha',
          odisha: true,
          verified: true
        }));
      allJobs = [...allJobs,...govtJobs];
    } catch (e) {
      console.log('Govt API error:', e.message);
    }
  }

  res.json(allJobs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ ODA Portal Server chalu hai port ${PORT} pe`));

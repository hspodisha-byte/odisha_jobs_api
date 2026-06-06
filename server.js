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

// POST wala route - AI search ke liye
app.post('/api/search', async (req, res) => {
  const { q, field, type } = req.body;
  let allJobs = [];

  try {
    const adzunaRes = await axios.get(`https://api.adzuna.com/v1/api/jobs/in/search/1`, {
      params: {
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        what: q || field || 'designer',
        where: 'odisha',
        results_per_page: 15
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
      startDate: '2026-07-01',
      type: job.contract_time || 'Full-time',
      field: field || 'Design',
      src: 'private',
      srcLabel: 'Private Portal',
      odisha: true,
      verified: true,
      aiFound: true
    }));
    allJobs = [...allJobs,...adzunaJobs];
  } catch (e) {
    console.log('Adzuna error:', e.message);
  }

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
        startDate: '2026-08-01',
        type: 'Government Post',
        field: field || 'Design',
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

  res.json({
    jobs: allJobs,
    advice: `Odisha me ${allJobs.length} jobs mili. Private + Govt dono se live data.`,
    sourcesSearched: ['Private Portal', 'data.gov.in'],
    searchTime: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
  });
});

// GET wala route - HTML page ke liye
app.get('/api/jobs', async (req, res) => {
  const q = req.query.q || 'designer';
  const field = req.query.field || '';
  const location = req.query.location || 'odisha'; // International ke liye empty bhejna
  let allJobs = [];

  try {
    const adzunaRes = await axios.get(`https://api.adzuna.com/v1/api/jobs/in/search/1`, {
      params: {
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        what: q || field || 'designer',
        where: location,
        results_per_page: 20
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
      startDate: '2026-07-01',
      type: job.contract_time || 'Full-time',
      field: field || 'Design',
      src: 'private',
      srcLabel: 'Private Portal',
      odisha: job.location.display_name.toLowerCase().includes('odisha'),
      verified: true
    }));
    allJobs = [...allJobs,...adzunaJobs];
  } catch (e) {
    console.log('Adzuna error:', e.message);
  }

  // Government jobs sirf Odisha ke liye
  if (location === 'odisha') {
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
          posted: '2026-06-01',
          startDate: '2026-08-01',
          type: 'Government Post',
          field: field || 'Design',
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
app.listen(PORT, () => console.log(`✅ Server chalu hai port ${PORT} pe`));

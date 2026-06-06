// GET wala route add kar HTML ke liye
app.get('/api/jobs', async (req, res) => {
  const q = req.query.q || 'designer';
  const field = req.query.field || '';
  let allJobs = [];

  try {
    const adzunaRes = await axios.get(`https://api.adzuna.com/v1/api/jobs/in/search/1`, {
      params: {
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        what: q || field || 'designer',
        where: 'odisha',
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
      srcLabel: 'Adzuna',
      odisha: true,
      verified: true
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
        const title = (job.title || job.department || '').toLowerCase();
        return title.includes('design') || title.includes('art') || title.includes('craft');
      })
   .map(job => ({
        id: 'govt_' + Math.random(),
        title: job.title || 'Government Position',
        org: job.department || 'Govt of Odisha',
        location: 'Odisha, India',
        desc: 'Government vacancy from data.gov.in',
        link: 'https://odisha.gov.in',
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

  res.json(allJobs); // Direct array bhej, object nahi
});

app.listen(3000, () => console.log('✅ Server chalu hai'));

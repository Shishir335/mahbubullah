(async function loadPrivacyPolicy() {
  const contentDiv = document.getElementById('privacy-policy-content');
  const CACHE_KEY = 'portfolio_public_profile_cache';
  
  // Extract project ID from URL (e.g. /cryptopulse/privacy-policy)
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[1];
  
  if (!projectId) {
    contentDiv.innerHTML = '<div class="error-msg">Project ID not found in URL.</div>';
    return;
  }

  const decodeHtmlEntities = (str) => {
    if (!str || typeof str !== 'string') return '';
    let decoded = str;
    for (let i = 0; i < 2; i += 1) {
      if (decoded.includes('&lt;') || decoded.includes('&gt;') || decoded.includes('&quot;') || decoded.includes('&#039;') || decoded.includes('&amp;')) {
        const txt = document.createElement('textarea');
        txt.innerHTML = decoded;
        decoded = txt.value;
      } else {
        break;
      }
    }
    return decoded;
  };

  const renderPolicy = (user) => {
    if (!user) return false;
    if (user.footerText) {
      const footerDisplay = document.getElementById('footer-text-display');
      if (footerDisplay) footerDisplay.textContent = user.footerText;
    }
    
    const projects = user.projects || [];
    const project = projects.find(p => {
      let pId = p.projectId;
      if (!pId && p.title) {
        pId = p.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      }
      return pId && pId.toLowerCase() === projectId.toLowerCase();
    });
    
    if (project) {
      document.title = `Privacy Policy - ${project.title}`;
      if (project.privacyPolicy && project.privacyPolicy.trim()) {
        const rawPolicy = project.privacyPolicy.trim();
        const decodedHtml = decodeHtmlEntities(rawPolicy);
        contentDiv.innerHTML = decodedHtml;
      } else {
        contentDiv.innerHTML = `<h2>Privacy Policy for ${project.title}</h2><p>No privacy policy has been provided for this project yet.</p>`;
      }
      return true;
    }
    contentDiv.innerHTML = `<div class="error-msg">Project with ID "${projectId}" not found.</div>`;
    return false;
  };

  // 1. Instant Cache Render
  let hasRenderedFromCache = false;
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cachedData = JSON.parse(cachedRaw);
      if (cachedData && cachedData.data) {
        hasRenderedFromCache = renderPolicy(cachedData.data);
      }
    }
  } catch (e) {
    console.debug('Privacy policy cache parse error:', e);
  }
  
  // 2. Network Fetch (Stale-While-Revalidate)
  try {
    const res = await fetch('/api/v1/admin/public-profile');
    const data = await res.json();
    
    if (res.ok && data.status === 'success') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch (storageErr) {
        console.debug('Failed to cache privacy policy data:', storageErr);
      }
      renderPolicy(data.data);
    } else if (!hasRenderedFromCache) {
      contentDiv.innerHTML = '<div class="error-msg">Failed to load project data.</div>';
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
    if (!hasRenderedFromCache) {
      contentDiv.innerHTML = '<div class="error-msg">An error occurred while loading the privacy policy.</div>';
    }
  }
})();

(async function loadPrivacyPolicy() {
  const contentDiv = document.getElementById('privacy-policy-content');
  
  // Extract project ID from URL (e.g. /cryptopulse/privacy-policy)
  const pathParts = window.location.pathname.split('/');
  const projectId = pathParts[1];
  
  if (!projectId) {
    contentDiv.innerHTML = '<div class="error-msg">Project ID not found in URL.</div>';
    return;
  }
  
  try {
    const res = await fetch('/api/v1/admin/public-profile');
    const data = await res.json();
    
    if (res.ok && data.status === 'success') {
      const user = data.data;
      
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
        if (project.privacyPolicy) {
          // Convert newlines to breaks if it's plain text, or just inject HTML
          contentDiv.innerHTML = project.privacyPolicy;
        } else {
          contentDiv.innerHTML = `<h2>Privacy Policy for ${project.title}</h2><p>No privacy policy has been provided for this project yet.</p>`;
        }
      } else {
        contentDiv.innerHTML = `<div class="error-msg">Project with ID "${projectId}" not found.</div>`;
      }
    } else {
      contentDiv.innerHTML = '<div class="error-msg">Failed to load project data.</div>';
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
    contentDiv.innerHTML = '<div class="error-msg">An error occurred while loading the privacy policy.</div>';
  }
})();

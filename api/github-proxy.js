export default async function handler(req, res) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = 'MatthieuLANNOYE/usv-planning';
    const GITHUB_FILE = 'data.json';
    const GITHUB_BRANCH = 'main';
  
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    try {
      // GET : Récupérer les matchs
      if (req.method === 'GET') {
        const resp = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
          {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
  
        if (!resp.ok) {
          console.error('GitHub GET error:', resp.status);
          return res.status(resp.status).json({ error: 'GitHub API error' });
        }
  
        const data = await resp.json();
        const content = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
        
        return res.status(200).json(content);
      }
  
      // PUT : Sauvegarder les matchs
      if (req.method === 'PUT') {
        const matches = req.body;
  
        // Récupérer le SHA actuel
        const getResp = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
          {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
  
        if (!getResp.ok) {
          console.error('GitHub GET SHA error:', getResp.status);
          return res.status(getResp.status).json({ error: 'Cannot get SHA' });
        }
  
        const fileData = await getResp.json();
        const sha = fileData.sha;
  
        // Mettre à jour le fichier
        const content = Buffer.from(JSON.stringify(matches, null, 2)).toString('base64');
  
        const updateResp = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `🔄 Mise à jour via API (${new Date().toLocaleString('fr-FR')})`,
              content: content,
              sha: sha,
              branch: GITHUB_BRANCH
            })
          }
        );
  
        if (!updateResp.ok) {
          const error = await updateResp.json();
          console.error('GitHub PUT error:', error);
          return res.status(updateResp.status).json(error);
        }
  
        console.log('✅ GitHub updated successfully');
        return res.status(200).json({ success: true });
      }
  
      return res.status(405).json({ error: 'Method not allowed' });
  
    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export async function pushToGitHub(repoName: string, description?: string) {
  const octokit = await getUncachableGitHubClient();
  
  const { data: user } = await octokit.users.getAuthenticated();
  
  let repo;
  try {
    const { data } = await octokit.repos.get({
      owner: user.login,
      repo: repoName,
    });
    repo = data;
    console.log(`Repository ${repoName} already exists`);
  } catch (error: any) {
    if (error.status === 404) {
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: description || 'IA Infinity - CRM SaaS Platform',
        private: false,
        auto_init: false,
      });
      repo = data;
      console.log(`Created new repository: ${repoName}`);
    } else {
      throw error;
    }
  }
  
  return {
    repoUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    owner: user.login,
    name: repoName,
  };
}

import { Octokit } from "@octokit/rest";

export async function getRepos(accessToken: string) {
  try {
    const octokit = new Octokit({ auth: accessToken });
    const repos = await octokit.repos.listForAuthenticatedUser();
    return repos.data;
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw new Error("Could not fetch repositories from GitHub.");
  }
}

export async function getCommits(accessToken: string, owner: string, repo: string) {
  try {
    const octokit = new Octokit({ auth: accessToken });
    const commits = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 10,
    });
    return commits.data;
  } catch (error) {
    console.error(`Error fetching commits for ${owner}/${repo}:`, error);
    throw new Error("Could not fetch commits from GitHub.");
  }
}

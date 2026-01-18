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

export async function getRepoTree(
  accessToken: string,
  owner: string,
  repo: string,
  sha: string
) {
  try {
    const octokit = new Octokit({ auth: accessToken });
    const tree = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: "true",
    });
    return tree.data.tree;
  } catch (error) {
    console.error(`Error fetching tree for ${owner}/${repo} at ${sha}:`, error);
    throw new Error("Could not fetch repository tree from GitHub.");
  }
}

export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string
) {
  try {
    const octokit = new Octokit({ auth: accessToken });
    const content = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });
    // @ts-ignore
    return Buffer.from(content.data.content, "base64").toString();
  } catch (error) {
    console.error(`Error fetching content for ${path}:`, error);
    throw new Error("Could not fetch file content from GitHub.");
  }
}

const fs = require('fs');

const ORG_NAME = '1141RWD';
// Use process.env.GITHUB_TOKEN if locally set, or from Actions secret
const TOKEN = process.env.GITHUB_TOKEN; 

const headers = {
    'User-Agent': '1141RWD-Data-Fetcher',
    'Accept': 'application/vnd.github.v3+json'
};

if (TOKEN) {
    headers['Authorization'] = `token ${TOKEN}`;
} else {
    console.warn("No GITHUB_TOKEN found. Rate limits will be strict.");
}

async function fetchData() {
    try {
        console.log(`Fetching profile for ${ORG_NAME}...`);
        const profile = await fetchGithub(`https://api.github.com/users/${ORG_NAME}`);
        
        console.log(`Fetching repositories for ${ORG_NAME}...`);
        // Note: For organizations, the endpoint is /orgs/{org}/repos, but user endpoint works for both users and orgs often
        // Iterate pages if > 100 in future, for now 100 is limit
        let repos = await fetchGithub(`https://api.github.com/users/${ORG_NAME}/repos?per_page=100`);
        
        if (!Array.isArray(repos)) {
            // Fallback for org endpoint if user endpoint fails differently
             repos = await fetchGithub(`https://api.github.com/orgs/${ORG_NAME}/repos?per_page=100`);
        }

        if (!Array.isArray(repos)) {
            throw new Error("Failed to fetch repositories.");
        }

        console.log(`Found ${repos.length} repositories. Fetching maintainers...`);

        // Enhance repos with maintainer info
        const enhancedRepos = await Promise.all(repos.map(async (repo) => {
            try {
                // Fetch last commit
                const commits = await fetchGithub(`${repo.url}/commits?per_page=1`);
                let maintainer = null;

                if (Array.isArray(commits) && commits.length > 0) {
                    const commit = commits[0];
                    const author = commit.author;
                    const commitAuthor = commit.commit.author;

                    maintainer = {
                        name: author ? author.login : commitAuthor.name,
                        avatar: author ? author.avatar_url : 'https://github.com/ghost.png'
                    };
                }

                return {
                    id: repo.id,
                    name: repo.name,
                    html_url: repo.html_url,
                    description: repo.description,
                    language: repo.language,
                    topics: repo.topics,
                    pushed_at: repo.pushed_at,
                    size: repo.size,
                    stargazers_count: repo.stargazers_count,
                    maintainer: maintainer
                };

            } catch (err) {
                console.warn(`Failed to fetch maintainer for ${repo.name}: ${err.message}`);
                return repo; // Return repo without maintainer if fail
            }
        }));

        const data = {
            generated_at: new Date().toISOString(),
            profile: {
                name: profile.name,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
                public_repos: profile.public_repos
            },
            repos: enhancedRepos
        };

        fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
        console.log('Successfully generated data.json');

    } catch (error) {
        console.error('Error in data generation:', error);
        process.exit(1);
    }
}

async function fetchGithub(url) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

fetchData();

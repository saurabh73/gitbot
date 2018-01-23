const fs = require('fs');
const GitHubApi = require('github');
const Git = require('simple-git');

module.exports = {

    getRepoSummary :(repoId, ownerId) => {
        return new Promise((resolve, reject) => {
            let github = new GitHubApi({});
            github.authenticate({
                type: 'basic',
                username: process.env.GIT_USER,
                password: process.env.GIT_TOKEN
            });

            github.repos.get({
                owner: ownerId,
                repo: repoId
            }, (err, res) => {
                if (err) {reject(err);}
                resolve(res.data);
            })
        });
    },
    listBranches: (repoId, ownerId) => {
        return new Promise((resolve, reject) => {
            let github = new GitHubApi({});
            github.authenticate({
                type: 'basic',
                username: process.env.GIT_USER,
                password: process.env.GIT_TOKEN
            });

            github.repos.getBranches({
                owner: ownerId,
                repo: repoId,
                per_page: 100
            }, (err, res) => {
                if (err) {reject(err);}
                let branchList = res.data.map((branch) => {
                    return {
                        name: branch.name
                    };
                });
                resolve(branchList);
            })
        });
    },
    listRepos: () => {
        return new Promise((resolve, reject) => {
            let github = new GitHubApi({});
            github.authenticate({
                type: 'basic',
                username: process.env.GIT_USER,
                password: process.env.GIT_TOKEN
            });

            github.repos.getAll({
                per_page: 100
            }, (err, res) => {
                if (err) {reject(err);}
                let repoList = res.data.map((repo) => {
                    return {
                        id : repo.id,
                        name: repo.name,
                        url: repo.clone_url,
                        owner: repo.owner.login
                    };
                });
                resolve(repoList);
            });
        });

    },

    cloneRepo: (repoPath, repo) =>{
        let url = repo.url.replace(/^https?:\/\//, '');
        let remote = `http://${process.env.GIT_USER}:${process.env.GIT_TOKEN}@${url}`;
        return new Promise((resolve) => {
            Git(repoPath)
                .silent(true)
                .clone(remote)
                .cwd(`${repoPath}/${repo.name}`)
                .checkout(repo.branch, (err) => {
                    if (err) {throw err;}
                    resolve();
                })
        });
    },
    doCommit: (repoPath, commitMessage) => {
        return new Promise((resolve) => {
            fs.readdir(repoPath, (err, items) => {
                console.log(items);
                Git(repoPath)
                    .silent(true)
                    .addConfig('user.name', 'gitbot-slack')
                    .addConfig('user.email', `gitbot@slack.com`)
                    .add('.', () => {
                        console.log("files added");
                    })
                    .commit(commitMessage, { '--author': `"${process.env.GIT_USER} <${process.env.GIT_USER}@users.noreply.github.com>"` }, () => {
                        console.log("files committed");
                        resolve()
                    })
            });
        });

    },
    doPush: (repo, repoPath) => {
        return new Promise((resolve) => {
            Git(repoPath)
                .silent(true)
                .status((err) => {
                    if (err) { throw err; }
                }).push('origin', repo.branch, (err , data) => {
                    if (err) { throw  err; }
                    resolve(data);
                })
        });
    }
};
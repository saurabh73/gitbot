const fs = require('fs');
const GitHubApi = require('github');
module.exports = {

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
                        url: repo.clone_url
                    };
                });
                resolve(repoList);
            });
        });

    },

    cloneRepo: (repoPath, repoUrl) =>{
        let simpleGit = require('simple-git/promise')(repoPath).silent(true);
        repoUrl = repoUrl.replace(/^https?:\/\//, '');
        let remote = `http://${process.env.GIT_USER}:${process.env.GIT_TOKEN}@${repoUrl}`;
        return simpleGit.clone(remote);
    },
    doCommit: (repoPath, commitMessage) => {
        console.log(repoPath);
        return new Promise((resolve) => {
            fs.readdir(repoPath, (err, items) => {
                console.log(items);

                require('simple-git')(repoPath)
                    .silent(true)
                    .addConfig('user.name', 'GIT BOT')
                    .cwd(repoPath)
                    .add('.', () => {
                        console.log("files added");
                    })
                    .commit(commitMessage, () => {
                        console.log("files committed");
                        resolve()
                    })
            });


        });

    },
    doPush: (repoPath) => {
        let simpleGit = require('simple-git')(repoPath);
        return new Promise((resolve) => {
            simpleGit.status((err, data) => {
                if (err) { throw err; }
                console.log(JSON.stringify(data));
            }).push('origin', 'master', (err , data) => {
                if (err) { throw  err; }
                resolve(data);
            })
        });
    }

};
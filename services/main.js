const slackFileService = require('./slack_file_service');
const gitService = require('./git_service');
const fs = require('fs');
const path = require('path');
const gitInstall = require('lambda-git');
const rimraf = require('rimraf');
const archiver = require('archiver');
const upload = require('../utils/upload');


module.exports = {
    processBotCommit : (callback, workspace, obj, botToken) => {
        let commitMessage;
        let slackFile = obj.file;
        slackFileService.downloadFile(slackFile, botToken, workspace.slackDir)
            .then(() => {
                console.log('file downloaded');
                return gitService.cloneRepo(workspace.repoDir, obj.repo);
            })
            .then(() => {
                console.log('clone success');
                //message(botToken,channel,`clone success`);
                return new Promise((resolve) => {
                    fs.readdir(workspace.repoDir, function (err, items) {
                        if (err) {
                            throw err;
                        }
                        items = items.filter(item => fs.lstatSync(path.join(workspace.repoDir, item)).isDirectory());
                        resolve(path.join(workspace.repoDir, items[0]));
                    });
                });
            })
            .then((repoDir) => {
                workspace.repoDir = repoDir;
                return slackFileService.moveSlackFiles(workspace.slackDir, workspace.repoDir);
            })
            .then(() => {
                console.log("slack files moved");
                let defaultCommitMsg = 'default git commit message';
                let fileComment = slackFile.comment;
                while (fileComment.indexOf("&amp;") >= 0) {
                    fileComment = fileComment.replace(new RegExp("&amp;", 'g'), "&");
                }
                fileComment = fileComment.replace(new RegExp("&lt;", 'g'), "<");
                fileComment = fileComment.replace(new RegExp("&gt;", 'g'), ">");
                fileComment = fileComment.replace("<@U80T78ACB>", "").trim();

                commitMessage = (fileComment !== "") ? fileComment : defaultCommitMsg;
                return gitService.doCommit(workspace.repoDir, commitMessage);
            })
            .then(() => {
                console.log("commit success");
                return gitService.doPush(obj.repo, workspace.repoDir);
            })
            .then(() => {
                console.log("push success");
                callback(null, {
                    text: 'Commit Success',
                    attachments: [{
                        title: obj.repo.name,
                        title_link: obj.repo.url,
                        fields: [
                            {
                                title: "Author",
                                value: obj.repo.owner,
                                short: true
                            },{
                                title: "Branch",
                                value: obj.repo.branch,
                                short: true
                            }
                        ],
                        text: `*${commitMessage}*`,
                        color: "good",
                        mrkdwn_in: ["text"]
                    }]
                });
            })
            .catch((err) => {
                console.log(err);
                callback(err, null);
            });
    },
    processBotFetch : (callback, workspace, obj, botToken)  => {
        gitService.cloneRepo(workspace.repoDir, obj.repo).then(() => {
            console.log('clone success');
            let repoPath = path.join(workspace.repoDir, obj.repo.name);
            rimraf(path.join(repoPath, '.git'), (err) => {
                if (err) {console.error(err);}

                let output = fs.createWriteStream(`${workspace.workDir}/${obj.repo.name}.zip`);
                let archive = archiver('zip');

                output.on('close', function () {
                    console.log(fs.readdirSync(workspace.workDir));
                    let file = fs.createReadStream(`${workspace.workDir}/${obj.repo.name}.zip`);
                    upload(botToken, obj.channel, `${obj.repo.name}.zip`, 'application/zip',file, callback);
                });

                archive.on('error', function (err) {
                    callback(err, null);
                });

                archive.pipe(output);
                archive.directory(repoPath, false);
                archive.finalize();

            });
        });
    },
    processBotInfo: (callback, obj) => {
        gitService.getRepoSummary(obj.repo.name, obj.repo.owner).then((summary) => {
            let slackMsg = {
                text: "Fetch Success",
                attachments: [{
                    title: summary.name,
                    title_link: summary.html_url,
                    fields: [
                        {
                            title: "Stars",
                            value: summary.stargazers_count,
                            short: true
                        },{
                            title: "Forks",
                            value: summary.forks_count,
                            short: true
                        },
                        {
                            title: "Watchers",
                            value: summary.watchers_count,
                            short: true
                        },
                        {
                            title: "Issues",
                            value: summary.open_issues,
                            short: true
                        }
                    ],
                    text: summary.description,
                    color: "good",
                    mrkdwn_in: ["text"]
                }]
            };
            callback(null, slackMsg);
        }).catch((err) => {
            console.log(err);
            callback(err, null);
        });
    },
    prepareRepoAction : (obj, message) => {
        let gitMenu = {
            text: message,
            attachments: [{
                text: "Choose repo",
                fallback: "Can't display repo list.",
                color: "#3AA3E3",
                attachment_type: "default",
                callback_id: "repo_selection",
                actions: [{
                    name: "git_bot",
                    text: "Choose repo...",
                    type: "select",
                    options: []
                }]
            }]
        };
        return new Promise((resolve) => {
            gitService.listRepos().then((list) => {
                let repoOptions = [];
                list.forEach((repo) => {
                    obj.repo = repo;
                    let optionValue = JSON.stringify(obj);
                    repoOptions.push({
                        text: repo.name,
                        value: optionValue
                    })
                });
                gitMenu.attachments[0].actions[0].options = repoOptions;
                resolve(gitMenu)
            })
        })
    },
    prepareBranchAction : (obj) => {
        let gitMenu = {
            text: `Please select the branch for repository ${obj.repo.name}?`,
            attachments: [{
                fallback: "Can't display branch list.",
                color: "#198555",
                attachment_type: "default",
                callback_id: "branch_selection",
                actions: [{
                    name: "git_bot",
                    text: "Choose branch...",
                    type: "select",
                    options: []
                }]
            }]
        };
        return new Promise((resolve) => {
            gitService.listBranches(obj.repo.name, obj.repo.owner).then((branchList) => {
                let branchOptions = [];
                branchList.forEach((branch) => {
                    if (branch.name !== "master") {
                        obj.repo.branch = branch.name;
                        let optionValue = JSON.stringify(obj);
                        branchOptions.push({
                            text: branch.name,
                            value: optionValue
                        })
                    }
                });

                branchOptions.sort(function(opt1, opt2) {
                    let nameA = opt1.text.toUpperCase(); // ignore upper and lowercase
                    let nameB = opt2.text.toUpperCase(); // ignore upper and lowercase
                    if (nameA < nameB) {
                        return -1;
                    } else if (nameA > nameB) {
                        return 1;
                    }
                    return 0;
                });
                // add master branch as first option
                obj.repo.branch = "master";
                branchOptions.unshift({
                    text: "master",
                    value: JSON.stringify(obj)
                });
                gitMenu.attachments[0].actions[0].options = branchOptions;

                if (branchOptions.length === 1) { // only master branch
                    resolve(null);
                } else {
                    resolve(gitMenu);
                }


            })
        });
    },
    prepareGitWorkspace : () => {
        return new Promise((resolve) => {
            const tempDir = '/tmp';
            const workspaceDir = 'workspace';
            let workspace = {
                workDir: path.join(tempDir, workspaceDir)
            };
            workspace.slackDir = path.join(workspace.workDir, 'slack-dest');
            workspace.repoDir = path.join(workspace.workDir, 'repo-dest');
            workspace.gitDir = path.join(workspace.workDir, 'git');

            if (!fs.existsSync(workspace.workDir)) {
                fs.mkdirSync(workspace.workDir);
                fs.mkdirSync(workspace.slackDir);
                fs.mkdirSync(workspace.repoDir);
            }
            gitInstall({
                targetDirectory: workspace.gitDir
            }).then(() => {
                resolve(workspace)
            });
        });
    }
};
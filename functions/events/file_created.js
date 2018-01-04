const lib = require('lib')({token: process.env.STDLIB_TOKEN});
const message = require('../../utils/message');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const gitInstall = require('lambda-git');


const slackFileService = require('../../services/slack_file_service');
const gitService = require('../../services/git_service');
const which = require('which');

/**
 *
 * @param {string} channel
 * @param {string} text
 * @param {object} event
 * @param {string} botToken
 * @returns {object}
 */
module.exports = (channel, text = '', event = {}, botToken = null, context, callback) => {
    const tempDir = '/tmp';
    const workspaceDir = 'workspace';

    let workspace = {
        workDir: path.join(tempDir, workspaceDir)
    };
    //let event = JSON.parse(eventstr);
    let fileId = event.file_id;
    let slackFile = null;
    let commitMessage = 'default git commit message';
    // commitMessage = slackFile.initial_comment.comment || ;

    let exitCallback =  (err, result) => {
        /** Do cleanup here */
        rimraf(workspace.workDir,  (err) => {
            if (err) {
                console.error(err)
            }
            callback(err, result);
        });
    };

     let prepareWorkspace = (tempDir, workspaceDir) => {
        return new Promise((resolve) => {
            /* prepare workspace */

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
                which('git', function (err, resolvedPath) {
                    if (err) {
                        throw new Error('Git not installed');
                    }
                    console.log("GIT Path "+ resolvedPath)
                });
                resolve(workspace)
            });

        });
    };

    message(botToken,channel,`File received for processing. Please wait ID: ${fileId}`, (err) => {
        if (err) {
            console.error(err);
            exitCallback(err, null);
        } else {
            console.log('Response Sent');
            prepareWorkspace(tempDir, workspaceDir)
                .then((result) => {
                    workspace = result;
                    return gitService.listRepos();
                })
                .then((repoList) => {
                    console.log(repoList);
                    return slackFileService.getFileInfo(fileId, botToken);
                })
                .then((response)=>{
                    slackFile = response.file;
                    console.log('file info fetched');
                    return slackFileService.downloadFile(slackFile, botToken, workspace.slackDir)
                })
                .then(() => {
                    console.log('file downloaded');
                    return gitService.cloneRepo(workspace.repoDir,"https://github.com/saurabh73/competitive-coding-practice.git");
                })
                .then(() => {
                    //message(botToken,channel,`clone success`);
                    return new Promise((resolve) => {
                        fs.readdir(workspace.repoDir, function(err, items) {
                            if (err) { throw err; }
                            items = items.filter(item => fs.lstatSync(path.join(workspace.repoDir,item)).isDirectory());
                            resolve(path.join(workspace.repoDir,items[0]));
                        });
                    });
                })
                .then((repoDir) => {
                    console.log(repoDir);
                    workspace.repoDir = repoDir;
                    return slackFileService.moveSlackFiles(workspace.slackDir, workspace.repoDir);
                })
                .then(() => {
                    console.log("slack files moved");
                    if (slackFile.initial_comment){
                        commitMessage = slackFile.initial_comment.comment || commitMessage;
                    }
                    return gitService.doCommit(workspace.repoDir, commitMessage);
                })
                .then(() => {
                    console.log("commit success");
                    return gitService.doPush(workspace.repoDir);
                })
                .then(() => {
                    console.log("push success");
                    exitCallback(null, {
                        text: 'success'
                    });
                })
                .catch((err) => {
                    console.log(err);
                    exitCallback(err, null);
                });
        }
    });




    /*
    message(botToken,channel,`File received for processing. Please wait ID: ${fileId}`, (err) => {
        if (err) {
            console.error(err);
            exitCallback(err, null);
        } else {
            console.log('Response Sent');
            let repository = null;
            let commitMessage = null;
            const repoUrl = "https://github.com/saurabh73/test-repository.git";
            // Login to fetch repo

            slackFileService(slackDir, fileId, botToken).then((file) => {
                commitMessage = file.initial_comment.comment || 'default commit';
                return gitService.createRepoDir(repoDir, repoUrl)
            }).then((repo) => {
                repository = repo;
                return fileUtils.moveFiles(slackDir, repoDir);
            }).then(() => {
                return gitService.addAndCommit(repository,commitMessage);
            }).then(() => {
                return gitService.remotePush(repository);
            }).then(() => {
                exitCallback(null, {
                    text: `Push successful`
                });
            }).catch((err) => {
                exitCallback(null, {
                    text: `error ${JSON.stringify(err)}}`
                });
            });
        }
    });
    */
};




    
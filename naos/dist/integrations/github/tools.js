"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGitHubIssueFromNotionTask = createGitHubIssueFromNotionTask;
exports.closeGitHubIssue = closeGitHubIssue;
exports.closeGitHubPR = closeGitHubPR;
exports.labelGitHubIssue = labelGitHubIssue;
const client_1 = require("./client");
async function createGitHubIssueFromNotionTask(params) {
    const issue = await (0, client_1.githubCreateIssue)(params);
    return { number: issue.number, url: issue.html_url };
}
async function closeGitHubIssue(issueNumber) {
    await (0, client_1.githubCloseIssue)(issueNumber);
}
async function closeGitHubPR(prNumber) {
    await (0, client_1.githubClosePR)(prNumber);
}
async function labelGitHubIssue(issueNumber, labels) {
    await (0, client_1.githubAddLabel)(issueNumber, labels);
}
//# sourceMappingURL=tools.js.map
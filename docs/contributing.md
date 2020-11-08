# Contributing to RaccoonChessSigma

RaccoonChessSigma is a MIT Licensed project and uses the standard GitHub pull requests process to review and accept contributions.

There are several areas of RaccoonChessSigma that could use your help. For starters, you could help in improving the sections in this document by either creating a new issue describing the improvement or submitting a pull request to this repository.

* If you are a first-time contributor, please see [Steps to Contribute](#steps-to-contribute).
* If you have a question about RaccoonChessSigma and cannot find the answer in the documentation? 
Use the **[Ask a Question](../.github/ISSUE_TEMPLATE/ask-a-question.md)** template and fill out the required fields.
* If you find a defect, use the **[Bug Report](../.github/ISSUE_TEMPLATE/bug_report.md)** template to submit any bugs.
Provide as much details as possible about the issue encountered, your environment, steps to reproduce the issue,
screenshots, logs, stack traces, and anything else that can describe the problem. The more details are initially provided, the faster the bug can be reproduced and triaged.
* If you have any idea on how to improve RaccoonChessSigma (nothing is too crazy 😀), open a **[Feature Request](../.github/ISSUE_TEMPLATE/feature_request.md)** and submit your idea to the community.
As with defects, a detailed description of your feature request will help maintainers evaluate the value and feasibility of your request more quickly.
When a request has been reviewed and accepted, it will be being scheduled for a future release, resulting in a related pull request.
* If you discovered a security vulnerability in this project? We ask you to alert the maintainers by sending an email describing the issue, impact, and 
fix - if applicable. You can reach RaccoonChessSigma maintainers at **michael.edegware@gmail.com**
* If you would like to make code contributions, all your commits should be signed with Developer Certificate of Origin. See [Sign your work](#sign-your-work). 

## Steps to Contribute:

* Find an [issue](https://github.com/medegw01/RaccoonChessSigma/issues) to work on or create a new issue.
* Claim your issue by commenting your intent to work on it to avoid duplication of efforts. 
* Fork this repository (also star 😉).
* Create a branch from where you want to base your work (usually main).
* Make your changes.
* Relevant coding style guidelines are the [TypeScript StyleGuide](https://basarat.gitbook.io/typescript/styleguide)
* Commit your changes by making sure the commit messages convey the need and notes about the commit.
* Push your changes to the branch in your fork of the repository.
* Submit a pull request to the original repository. See [Pull Request checklist](#pull-request-checklist)
  
## Pull Request Checklist :
* Rebase to the current main branch before submitting your pull request.
* Commits should be as small as possible. Each commit should follow the checklist below:

  - For code changes, add tests relevant to the fixed bug or new feature
  - Pass the GitHub test - includes spell checks, testing, etc
  - Commit header (first line) should convey what changed
  - DCO Signed 


## Signing your commits

We require that developers sign off their commits to certify that they have permission to contribute the code in a pull request. This way of certifying is commonly known as the [Developer Certificate of Origin (DCO)](https://developercertificate.org/). We encourage all contributors to read the DCO text before signing a commit and making contributions.

To make sure that pull requests have all commits signed off, we use the Probot DCO plugin.

#### Signing off a commit

Using the git command line
Use either `--signoff` or `-s` with the commit command. See this [document](https://probot.github.io/apps/dco/) for an example.

Make sure you have your user name and e-mail set. The `--signoff` or `-s` option will use the configured user name and e-mail, so it is important to configure it before the first time you commit. Check the following references:

* Setting up your github user name [reference](https://help.github.com/articles/setting-your-username-in-git/)
* Setting up your e-mail address [reference](https://help.github.com/articles/setting-your-commit-email-address-in-git/)

In practice, just add a line to every git commit message:

Signed-off-by: Jane Smith jane.smith@example.com Use your real name (sorry, no pseudonyms or anonymous contributions).
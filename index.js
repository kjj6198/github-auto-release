const semver = require('semver');
const INITIAL_VERION = 'v0.1.0';
const FEATURE = 'feature';
const BUG = 'bug';
const ENHANCEMENT = 'enhancement';
const TECHNICAL = 'technical';
const MAJOR = 'major';

const getNextVersion = (version, labels) => {
  labels
    .map(label => label.name)
    .forEach(label => {
      switch (label) {
        case FEATURE:
          version = semver.inc(version, 'minor');
          break;
        case BUG:
        case ENHANCEMENT:
        case TECHNICAL:
          version = semver.inc(version, 'patch');
          semver.inc(version, 'patch');
          break;
        case MAJOR:
          version = semver.inc(version, 'major');
          break;
      }
    });

  return `v${version}`;
}

const toReleaseNote = (pr) => {
  return `* [${pr.labels[0].name}] ${pr.title}`
};

module.exports = (robot) => {
  robot.on('pull_request.closed', async (context) => {
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    if (!owner || !repo) {
      robot.log('exit becasue owner and repo is not defined.');
      process.exit(0);
      return;
    }

    const res = await context.github.repos.getTags({
      owner,
      repo,
    });
    
    const ver = res.data.length > 0
      ? res.data[0].name
      : INITIAL_VERION;

    const nextVersion = getNextVersion(ver.substr(1), context.payload.pull_request.labels);

    try {
      const result = await context.github.gitdata.createReference({
        owner,
        repo,
        ref: `refs/tags/${nextVersion}`,
        sha: context.payload.pull_request.merge_commit_sha,
      });

      const releaseResult = await context.github.repos.createRelease({
        owner,
        repo,
        tag_name: nextVersion,
        name: nextVersion,
        body: toReleaseNote(context.payload.pull_request),
        draft: true,
      })
      
      robot.log(`Successfully created tag: ${nextVersion}`);
      robot.log(`visit: ${context.payload.repository.html_url}/releases/tag/${nextVersion}`);
    } catch(e) {
      robot.log(`can not create tag: ${e.error}`);
    }
  })
}

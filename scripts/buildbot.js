// Description:
//   Provides an interface to Buildbot v0.8.10
//
// Dependencies:
//   "cron": "^0.3.3",
//
// Configuration:
//   HUBOT_BUILDBOT_URL_NO_TRAILING_SLASH: url to buildbot server
//
// Commands:
//   hubot build <branch> on <builder>. <reason>
//
// Author:
//   t.brown@wordstream.com

const querystring = require('querystring');

const BUILDBOT_URL = process.env.HUBOT_BUILDBOT_URL_NO_TRAILING_SLASH;
if (!BUILDBOT_URL) {
  console.log("no HUBOT_BUILDBOT_URL_NO_TRAILING_SLASH in environment: please set and try again");
  process.exit(1);
}

const CRON_TIME_EVERY_10_SECONDS = '*/10 * * * * *';

const cronJob = require('cron').CronJob;

const DEBUG_LOGGING = false;

module.exports = function(robot) {

    let notifier;
    robot.respond(/build (.*) on (.*)/i, function(res) {
        // parse request
        const branch = res.match[1];
        const builder = res.match[2];

        // check if there's already something building
        robot.http(BUILDBOT_URL + "/json/builders/" + builder)
            .header('Cookie', [`_oauthproxy="${robot.brain.get('oauthproxy')}"`])
            .header('Accept', 'application/json')
            .get()(function(err, result, body) {
                if (DEBUG_LOGGING) {
                    console.log(`Made pre-build GET request. ${err}, ${result.statusCode}, ${result.getHeader}, ${body}`);
                }
                if (err) {
                    res.send(`Error occurred: ${err}`);
                    return;
                }
                if (result.statusCode === 403) {
                    res.send("Buildbot auth failed. @topher - fix me!");
                    return;
                }
                let preRequestBuilderStatus = JSON.parse(body);
                if ((preRequestBuilderStatus.currentBuilds.length > 0) ||
                    (preRequestBuilderStatus.pendingBuilds > 0)) {
                    res.send(`Build already in progress on ${builder}`);
                    return;
                }

                // nothing already building, make a request to build
                const payload = querystring.stringify({
                    username: res.envelope.user.name,
                    reason: 'toph test',  // TODO
                    branch,
                    forcescheduler: 'force',
                    revision: ''
                });
                robot.http(BUILDBOT_URL + "/builders/" + builder + "/force")
                    .header('Cookie', [`_oauthproxy="${robot.brain.get('oauthproxy')}"`])
                    .header('Content-Type', 'application/x-www-form-urlencoded')
                    .post(payload)(function(err, result, body) {
                        if (DEBUG_LOGGING) {
                            console.log(`Made build request. ${err}, ${result.statusCode}, ${result.getHeader}, ${body}`);
                        }
                        if (err) {
                            res.send(`Error occurred: ${err}`);
                            return;
                        }
                        if (result.statusCode === 403) {
                            res.send("Buildbot auth failed 2. @topher - fix me!");
                            return;
                        }
                        if (result.statusCode !== 302) {
                            res.send(`Error occurred: ${result.statusCode}`);
                            return;
                        }

                        // get the build id of the newly started build
                        robot.http(BUILDBOT_URL + "/json/builders/" + builder)
                            .header('Cookie', [`_oauthproxy="${robot.brain.get('oauthproxy')}"`])
                            .header('Accept', 'application/json')
                            .get()(function(err, result, body) {
                                if (DEBUG_LOGGING) {
                                    console.log(`Made post-build GET request. ${err}, ${result.statusCode}, ${result.getHeader}, ${body}`);
                                }
                                if (err) {
                                    res.send(`Error occurred: ${err}`);
                                    return;
                                }
                                if (result.statusCode === 403) {
                                    res.send("Buildbot auth failed 3. @topher - fix me!");
                                    return;
                                }
                                preRequestBuilderStatus = JSON.parse(body);
                                if (preRequestBuilderStatus.currentBuilds.length !== 1) {
                                    res.send("Build started, but unable to find build id. Monitoring disabled");
                                }

                                const buildId = preRequestBuilderStatus.currentBuilds[0];
                                res.send(`Building ${branch} on <${builder}|${BUILDBOT_URL}/builders/${builder}/builds/${buildId}>`);
                                let builds = robot.brain.get('builds');
                                if (!builds) {
                                    builds = [];
                                }
                                builds.push({
                                    branch,
                                    builder,
                                    buildId,
                                    room: res.envelope.room,
                                    responded: false
                                });
                                robot.brain.set('builds', builds);
                            });
                    });
            });
    });

    robot.respond(/buildbot auth (.*)/i, function(res) {
        robot.brain.set('oauthproxy', res.match[1]);
        return res.send('Set new auth!');
    });

    notifier = new cronJob(
        CRON_TIME_EVERY_10_SECONDS,
        function() {
            const builds = robot.brain.get('builds');
            if (!builds) {
                return;
            }
            builds.forEach(function(build) {
                if (build.responded) {
                    return;
                }
                // figure out if the build is completed
                robot.http(BUILDBOT_URL + "/json/builders/" + build.builder + "/builds/" + build.buildId)
                    .header('Cookie', [`_oauthproxy="${robot.brain.get('oauthproxy')}"`])
                    .header('Accept', 'application/json')
                    .get()(function(err, result, body) {
                        console.log(`build GET request. ${err}, ${result.statusCode}, ${result.getHeader}, ${body}`);
                        if (err) {
                            console.log(`Error occurred: ${err}`);
                            return;
                        }
                        if (result.statusCode === 403) {
                            robot.messageRoom('topher', "Buildbot auth failed for monitor process");
                            return;
                        }
                        const status = JSON.parse(body);
                        if (!status.text || (status.text.length === 0)) {
                            // we're still running
                        } else if (status.text.includes('failed')) {
                            robot.messageRoom(build.room, `Build ${branch} on <${builder}|${BUILDBOT_URL}/builders/${builder}/builds/${buildId}> failed`);
                            build.responded = true;
                        } else if (status.text.includes('successful')) {
                            robot.messageRoom(build.room, `Build ${branch} on <${builder}|${BUILDBOT_URL}/builders/${builder}/builds/${buildId}> completed`);
                            build.responded = true;
                        } else {
                            robot.messageRoom(build.room, `${build.builder}:${build.buildId} unknown status ${status.text}`);
                            build.responded = true;
                        }
                    });
            });
        },
        null,
        true);
};

